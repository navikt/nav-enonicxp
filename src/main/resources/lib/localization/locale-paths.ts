import * as contentLib from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { getLayersData, isValidLocale } from './layers-data';
import { logger } from '../utils/logging';
import { runInLocaleContext } from './locale-context';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { Content } from '/lib/xp/content';
import { getLayersMultiConnection } from './locale-utils';
import { stripPathPrefix } from '../paths/path-utils';

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
            // Must not inherit content from the parent layer, ie the content must be localized
            mustNot: [
                {
                    hasValue: {
                        field: 'inherit',
                        values: ['CONTENT'],
                    },
                },
            ],
        },
    },
});

const getNodesFromAllLayers = ({ path, branch }: { path: string; branch: RepoBranch }) => {
    return getLayersMultiConnection(branch).query(getPathQueryParams(path)).hits;
};

type ContentPathTarget = {
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

// Search all layers for an exact path match
const resolveExactPath = (path: string, branch: RepoBranch): ContentPathTarget | null => {
    const foundNodes = getNodesFromAllLayers({ path, branch });
    if (foundNodes.length === 0) {
        return null;
    }

    const { defaultLocale, repoIdToLocaleMap } = getLayersData();

    if (foundNodes.length === 1) {
        const { id, repoId } = foundNodes[0];
        return handleExactPathFound({ id, path, locale: repoIdToLocaleMap[repoId] });
    }

    // If we found multiple nodes with this path, prefer to get the content from default layer
    const defaultLayerNodes = foundNodes.filter((node) => node.repoId === CONTENT_ROOT_REPO_ID);

    // If the multiple nodes were found in localized layers only, return the oldest and log an error
    // We don't want paths to be ambiguous across localizations
    if (defaultLayerNodes.length === 0) {
        logger.critical(
            `Content ${path} found in multiple layers, but not in the default!`,
            true,
            true
        );

        const { id, repoId } = foundNodes[0];
        return handleExactPathFound({ id, path, locale: repoIdToLocaleMap[repoId] });
    }

    // If multiple content with the same path was found in the default layer, it most likely means
    // a duplicate customPath. Log error and return oldest
    if (defaultLayerNodes.length > 1) {
        logger.critical(
            `Multiple contents with path "${path}" found in default layer!`,
            true,
            true
        );
    }

    return handleExactPathFound({ id: defaultLayerNodes[0].id, path, locale: defaultLocale });
};

// Resolve a suffixed path for a specific locale, which does not match any actual _path/customPath
// fields. Ie a request for "nav.no/mypage/en" should resolve to the content on path "nav.no/mypage"
// in the layer for "en" locale
const resolveLocalePath = (path: string, branch: RepoBranch): ContentPathTarget | null => {
    const { defaultLocale } = getLayersData();

    const pathSegments = path.split('/');
    const possibleLocale = pathSegments.pop();

    // The default locale should not be an allowed suffix. For this locale we only want to resolve
    // requests for the actual path, with no locale-suffix.
    if (possibleLocale === defaultLocale || !isValidLocale(possibleLocale)) {
        return null;
    }

    const possiblePath = pathSegments.join('/');

    const localeContent = runInLocaleContext({ locale: possibleLocale, branch }, () =>
        contentLib.query(getPathQueryParams(possiblePath))
    ).hits;

    if (localeContent.length === 0) {
        return null;
    }

    // This should ideally never happen, but could potentially happen if safeguards against
    // duplicate customPaths are somehow bypassed (ie with a manual database edit)
    if (localeContent.length > 1) {
        logger.critical(`Multiple hits for ${possiblePath}!`);
    }

    // If we somehow find multiple contents with the same path, we return the oldest.
    const content = localeContent[0];

    return { content, locale: possibleLocale };
};

// A valid path can be an exact match for an internal content _path, or a data.customPath,
// or a locale-specific variant of either of the two, suffixed with a supported locale
export const resolvePathToTarget = ({
    path,
    branch,
}: {
    path: string;
    branch: RepoBranch;
}): ContentPathTarget | null => {
    return resolveExactPath(path, branch) || resolveLocalePath(path, branch);
};
