import * as contentLib from '/lib/xp/content';
import { MultiRepoNodeQueryHit } from '/lib/xp/node';
import { RepoBranch } from '../../../types/common';
import { getLayersData, isValidLocale } from '../../../lib/localization/layers-data';
import { logger } from '../../../lib/utils/logging';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { CONTENT_ROOT_REPO_ID } from '../../../lib/constants';
import { Content } from '/lib/xp/content';
import { stripPathPrefix } from '../../../lib/paths/path-utils';
import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { NON_LOCALIZED_QUERY_FILTER } from '../../../lib/localization/layers-repo-utils/localization-state-filters';

// Will return all matches for internal _path names as well as customPaths, for root content and
// localized content only. Sorted by created time
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
                        values: [stripPathPrefix(path)],
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

type ContentAndLocale = {
    content: Content;
    locale: string;
};

const handleExactPathFound = ({
    id,
    path,
    locale,
}: {
    id: string;
    path: string;
    locale: string;
}) => {
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

const nodeHitsToString = (nodeHits: readonly MultiRepoNodeQueryHit[]) =>
    nodeHits.map((node) => `"${node.id}" (${node.repoId})`).join(', ');

// Search all layers for an exact path match
const resolveExactPath = (path: string, branch: RepoBranch): ContentAndLocale | null => {
    const foundNodes = getNodesFromAllLayers({ path, branch });
    if (foundNodes.length === 0) {
        return null;
    }

    const { defaultLocale, repoIdToLocaleMap } = getLayersData();

    if (foundNodes.length === 1) {
        const { id, repoId } = foundNodes[0];
        return handleExactPathFound({ id, path, locale: repoIdToLocaleMap[repoId] });
    }

    // If we found multiple content with this path, it should only match in the default project.
    // Content in layers without a unique path should only be served with an appropriate locale
    // suffix, which will be resolved via resolveLocalePath.
    const defaultLayerNodes = foundNodes.filter((node) => node.repoId === CONTENT_ROOT_REPO_ID);

    // If there are multiple content with the same path in non-default layers, it usually means the
    // content has been deleted from the default layer, or has been moved or had its customPath changed.
    // In either case, the content should only be served from a layer if it can be resolved via resolveLocalePath.
    if (defaultLayerNodes.length === 0) {
        logger.warning(
            `Content with path "${path}" found in multiple layers, but not in the default project: ${nodeHitsToString(
                foundNodes
            )}`,
            true,
            true
        );

        return null;
    }

    // If multiple content with the same path was found in the default layer, it most likely means
    // a duplicate customPath. Log error and return the oldest content.
    if (defaultLayerNodes.length > 1) {
        logger.critical(
            `Multiple contents with path "${path}" found in default project: ${nodeHitsToString(
                defaultLayerNodes
            )}`,
            true,
            true
        );
    }

    return handleExactPathFound({ id: defaultLayerNodes[0].id, path, locale: defaultLocale });
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

    const strippedPath = stripPathPrefix(path);

    const hitsWithCustomPath = hits.filter((hit) => hit.data?.customPath === strippedPath);

    if (hitsWithCustomPath.length > 1) {
        logger.critical(`Multiple content found with customPath ${strippedPath}!`);
    }

    // We always return the oldest content if there are multiple hits on a path
    if (hitsWithCustomPath.length > 0) {
        return hitsWithCustomPath[0];
    }

    logger.critical(
        `Multiple content found with internal _path ${path} - This should be impossible! :O`
    );

    return hits[0];
};

// Resolve a suffixed path for a specific locale, which does not match any actual _path/customPath
// fields. Ie a request for "nav.no/mypage/en" should resolve to the content on path "nav.no/mypage"
// in the layer for "en" locale
const resolveLocalePath = (path: string, branch: RepoBranch): ContentAndLocale | null => {
    const { defaultLocale } = getLayersData();

    const pathSegments = path.split('/');
    const possibleLocale = pathSegments.pop();

    // The default locale should not be an allowed suffix. For this locale we only want to resolve
    // requests for the actual path, with no locale-suffix.
    if (possibleLocale === defaultLocale || !isValidLocale(possibleLocale)) {
        return null;
    }

    const possiblePath = pathSegments.join('/');

    const localeContent = getContentFromLocaleLayer(possiblePath, possibleLocale, branch);

    if (!localeContent) {
        return null;
    }

    return { content: localeContent, locale: possibleLocale };
};

// A valid path can be an exact match for an internal content _path, or a data.customPath,
// or a locale-specific variant of either of the two, suffixed with a supported locale
export const findTargetContentAndLocale = ({
    path,
    branch,
}: {
    path: string;
    branch: RepoBranch;
}): ContentAndLocale | null => {
    return resolveLocalePath(path, branch) || resolveExactPath(path, branch);
};
