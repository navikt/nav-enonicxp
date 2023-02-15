import * as contentLib from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { stripPathPrefix } from '../utils/nav-utils';
import { getLayersData, isValidLocale } from './layers-data';
import { logger } from '../utils/logging';
import { runInLocaleContext } from './locale-context';
import { contentRootRepoId } from '../constants';
import { MultiRepoNodeQueryHit } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { getLayersMultiConnection } from './locale-utils';

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

// Search all layers for an exact path. If a match is found in multiple layers, we prefer the node
// from the default/root project layer, otherwise the oldest node is returned
const resolveExactPath = (
    foundNodes: ReadonlyArray<MultiRepoNodeQueryHit>,
    path: string
): ContentPathTarget | null => {
    const { defaultLocale, repoIdToLocaleMap } = getLayersData();

    if (foundNodes.length > 1) {
        const defaultNode = foundNodes.find((node) => node.repoId === contentRootRepoId);
        if (defaultNode) {
            logger.info(`Content ${path} found in multiple layers, returning default`);
            const content = contentLib.get({ key: defaultNode.id });
            if (!content) {
                return null;
            }

            return { content, locale: defaultLocale };
        }

        logger.critical(`Content ${path} found in multiple layers, but not in the default!`);
    }

    const { id, repoId } = foundNodes[0];

    const locale = repoIdToLocaleMap[repoId];

    // This should not be possible!
    if (!locale) {
        logger.critical(
            `Content for path ${path} found in repo ${repoId} for but no locale was found for this repo!`
        );
        return null;
    }

    const content = runInLocaleContext({ locale }, () => contentLib.get({ key: id }));

    // This should also not be possible!
    if (!content) {
        logger.critical(
            `Content for path ${path} with locale ${locale} was found with repo query but not with contentLib!`
        );
        return null;
    }

    return content ? { content, locale } : null;
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
        logger.info(`Not a valid locale suffix: ${possibleLocale}`);
        return null;
    }

    const possiblePath = pathSegments.join('/');

    const localeContent = runInLocaleContext({ locale: possibleLocale, branch }, () =>
        contentLib.query(getPathQueryParams(possiblePath))
    ).hits;

    if (localeContent.length === 0) {
        logger.info(`Content ${possiblePath} not found in any layer`);
        return null;
    }

    // This should ideally never happen, but could potentially happen if safeguards against
    // duplicate customPaths are somehow bypassed (ie with a manual database edit)
    if (localeContent.length > 1) {
        logger.critical(`Multiple hits for ${possiblePath}!`);
    }

    // If we somehow find multiple contents with the same path, we return the oldest.
    const content = localeContent[0];

    logger.info(`Content ${possiblePath} found with locale ${possibleLocale}`);
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
    const foundNodes = getNodesFromAllLayers({ path, branch });

    return foundNodes.length > 0
        ? resolveExactPath(foundNodes, path)
        : resolveLocalePath(path, branch);
};
