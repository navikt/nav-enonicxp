import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { getLayersData } from '../../../lib/localization/layers-data';
import { logger } from '../../../lib/utils/logging';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { CONTENT_ROOT_REPO_ID } from '../../../lib/constants';
import { stripPathPrefix } from '../../../lib/paths/path-utils';
import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { NON_LOCALIZED_QUERY_FILTER } from '../../../lib/localization/layers-repo-utils/localization-state-filters';
import { resolveLocalePathToBasePath } from '../../../lib/paths/locale-paths';

type ContentAndLocale = {
    content: Content;
    locale: string;
};

// Will return all matches for internal _path names as well as customPaths, for root content and
// localized content only.
const getPathQueryParams = (path: string) => ({
    start: 0,
    count: 100,
    sort: 'createdTime ASC',
    filters: {
        boolean: {
            // Must match either the internal content path, or a custom path
            should: [
                {
                    hasValue: {
                        field: '_path',
                        values: [`/content${path}`],
                    },
                },
                {
                    hasValue: {
                        field: 'data.customPath',
                        // Handle root path with a fallback to '/'
                        values: [stripPathPrefix(path) || '/'],
                    },
                },
            ],
            mustNot: NON_LOCALIZED_QUERY_FILTER,
        },
    },
});

const getNodesFromAllLayers = ({ path, branch }: { path: string; branch: RepoBranch }) => {
    return getLayersMultiConnection(branch).query(getPathQueryParams(path)).hits;
};

const getContentWithCustomPath = (path: string, hits: Content<any>[]) => {
    const strippedPath = stripPathPrefix(path);

    const hitsWithCustomPath = hits.filter((hit) => hit.data?.customPath === strippedPath);

    if (hitsWithCustomPath.length > 1) {
        logger.critical(`Multiple content found with customPath ${strippedPath}!`);
    }

    return hitsWithCustomPath;
};

const handleExactHit = (id: string, path: string, locale: string) => {
    // This should not be possible!
    if (!locale) {
        logger.critical(`No locale found for content with id "${id}" an path "${path}"!`);
        return null;
    }

    const content = runInLocaleContext({ locale }, () => contentLib.get({ key: id }));

    // This will happen for prepublished content
    if (!content) {
        logger.info(`Live content not found for path ${path} with locale ${locale}`);
        return null;
    }

    return content ? { content, locale } : null;
};

const getContentFromMultipleHits = (path: string, hits: Content[]) => {
    const hitsWithCustomPath = getContentWithCustomPath(path, hits);

    // We always return the oldest content if there are multiple hits on a path
    if (hitsWithCustomPath.length > 0) {
        return hitsWithCustomPath[0];
    }

    logger.critical(
        `Multiple content found with internal _path ${path} - This should be impossible! :O`
    );

    return hits[0];
};

// Search all layers for an exact path match
const resolveExactPath = (path: string, branch: RepoBranch): ContentAndLocale | null => {
    const foundNodes = getNodesFromAllLayers({ path, branch });
    if (foundNodes.length === 0) {
        return null;
    }

    const { defaultLocale, repoIdToLocaleMap } = getLayersData();

    if (foundNodes.length === 1) {
        const { id, repoId } = foundNodes[0];
        return handleExactHit(id, path, repoIdToLocaleMap[repoId]);
    }

    // If we found multiple content with this path, it should only match in the default project.
    // Content in layers without a unique path should only be served with an appropriate locale
    // suffix, which will be resolved via resolveLocalePath.
    const defaultLayerNodes = foundNodes.filter((node) => node.repoId === CONTENT_ROOT_REPO_ID);

    // If there are multiple content with the same path in non-default layers, it usually means the
    // content has been deleted from the default layer, or has been moved or had its customPath changed.
    // In either case, the content should only be served from a layer if it can be resolved via resolveLocalePath.
    if (defaultLayerNodes.length === 0) {
        const nodeHitsString = foundNodes.map((node) => `"${node.id}" (${node.repoId})`).join(', ');

        logger.warning(
            `Content with path "${path}" found in multiple layers, but not in the default project: ${nodeHitsString}`,
            true,
            true
        );

        return null;
    }

    if (defaultLayerNodes.length === 1) {
        return handleExactHit(defaultLayerNodes[0].id, path, defaultLocale);
    }

    const contentIds = defaultLayerNodes.map((node) => node.id);

    const { hits } = contentLib.query({
        count: contentIds.length,
        filters: {
            ids: {
                values: contentIds,
            },
        },
    });

    const content = getContentFromMultipleHits(path, hits);

    return content ? { content, locale: defaultLocale } : null;
};

const getContentFromLocaleLayer = (path: string, locale: string, branch: RepoBranch) => {
    const { hits } = runInLocaleContext({ locale: locale, branch }, () =>
        contentLib.query(getPathQueryParams(path))
    );

    if (hits.length === 0) {
        return null;
    }

    if (hits.length === 1) {
        return hits[0];
    }

    return getContentFromMultipleHits(path, hits);
};

// Resolve a suffixed path for a specific locale.
// A request for "/mypage/en" should resolve to the content on path "nav.no/mypage" in the layer for "en" locale
const resolveLocalePath = (
    maybeLocalePath: string,
    branch: RepoBranch
): ContentAndLocale | null => {
    const pathAndLocale = resolveLocalePathToBasePath(maybeLocalePath);
    if (!pathAndLocale) {
        return null;
    }

    const { basePath, locale } = pathAndLocale;

    const localeContent = getContentFromLocaleLayer(basePath, locale, branch);
    if (!localeContent) {
        return null;
    }

    return { content: localeContent, locale: locale };
};

// A valid path can be an exact match for an internal content _path, or a data.customPath,
// or a locale-specific variant of either of the two, suffixed with a supported locale
//
// As an example for order of lookups, a request for "/mypage/en" should do lookups in this order:
// - /mypage as a customPath in the en layer
// - /mypage as an internal _path in the en layer
// - /mypage/en as a customPath in the default layer
// - /mypage/en as a customPath in any other layer
// - /mypage/en as an internal path in the default layer
// - /mypage/en as an internal path in any other layer
export const findTargetContentAndLocale = ({
    path,
    branch,
}: {
    path: string;
    branch: RepoBranch;
}): ContentAndLocale | null => {
    return resolveLocalePath(path, branch) || resolveExactPath(path, branch);
};
