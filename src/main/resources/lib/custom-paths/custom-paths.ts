import contentLib, { Content } from '/lib/xp/content';
import nodeLib from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { runInBranchContext } from '../utils/branch-context';
import { forceArray, stripPathPrefix as _stripPathPrefix } from '../utils/nav-utils';
import { logger } from '../utils/logging';
import { componentAppKey, contentRepo } from '../constants';

type ContentWithCustomPath = Content & { data: { customPath: string } };

const validCustomPathPattern = new RegExp('^/[0-9a-z-/]*$');

// For custom paths, we need the leading slash on the root path
const stripPathPrefix = (path: string) => _stripPathPrefix(path) || '/';

export const isValidCustomPath = (path?: string) =>
    typeof path === 'string' && validCustomPathPattern.test(path);

export const hasValidCustomPath = (content: Content): content is ContentWithCustomPath => {
    return isValidCustomPath((content as ContentWithCustomPath).data?.customPath);
};

export const hasInvalidCustomPath = (content: Content): content is ContentWithCustomPath => {
    const customPath = (content as ContentWithCustomPath).data?.customPath;

    return !!(customPath && !isValidCustomPath(customPath));
};

// If the content has a custom path and it is not the requested path
// we should redirect to the custom path
export const shouldRedirectToCustomPath = (
    content: Content,
    requestedPathOrId: string,
    branch: RepoBranch
): content is ContentWithCustomPath => {
    return (
        hasValidCustomPath(content) &&
        stripPathPrefix(requestedPathOrId) !== content.data.customPath &&
        branch === 'master'
    );
};

export const getCustomPathFromContent = (contentId: string, versionId?: string) => {
    const content = contentLib.get({ key: contentId, versionId });
    return content && hasValidCustomPath(content) ? content.data.customPath : null;
};

export const getContentFromCustomPath = (path: string) => {
    const customPath = stripPathPrefix(path);
    if (!isValidCustomPath(customPath)) {
        return [];
    }

    return runInBranchContext(
        () =>
            contentLib.query({
                start: 0,
                count: 2,
                filters: {
                    boolean: {
                        must: {
                            hasValue: {
                                field: 'data.customPath',
                                values: [customPath],
                            },
                        },
                    },
                },
            }).hits,
        'master'
    );
};

// Looks for content where 'path' is set as a valid custom public-facing path
// and if found, returns the actual content path
export const getInternalContentPathFromCustomPath = (xpPath: string) => {
    const path = stripPathPrefix(xpPath);
    if (!isValidCustomPath(path)) {
        return null;
    }

    const content = getContentFromCustomPath(path);

    if (content.length === 0) {
        return null;
    }

    if (content.length > 1) {
        logger.critical(`Custom public path ${path} exists on multiple content objects!`);
        return null;
    }

    return content[0]._path;
};

const getPathMapFromDependencies = (contentId: string) => {
    // getOutboundDependencies throws an error if the key does not exist
    try {
        return contentLib
            .getOutboundDependencies({
                key: contentId,
            })
            .reduce((pathMapAcc, dependencyId) => {
                const dependencyContent = contentLib.get({ key: dependencyId });

                if (dependencyContent && hasValidCustomPath(dependencyContent)) {
                    return {
                        ...pathMapAcc,
                        [stripPathPrefix(dependencyContent._path)]:
                            dependencyContent.data.customPath,
                    };
                }

                return pathMapAcc;
            }, {});
    } catch (e) {
        return {};
    }
};

const getPathMapForAreaPage = (contentId: string) => {
    const repo = nodeLib.connect({ repoId: contentRepo, branch: 'master' });
    const content = repo.get({ key: contentId });
    if (!content || content.type !== 'no.nav.navno:area-page') {
        return {};
    }

    const situationIds = forceArray(content.components).reduce((acc, component) => {
        if (
            component.type !== 'part' ||
            component.part.descriptor !== 'no.nav.navno:areapage-situation-card'
        ) {
            return acc;
        }

        const target = component.part.config?.[componentAppKey]['areapage-situation-card'].target;
        if (!target) {
            return acc;
        }

        return [...acc, target];
    }, []);

    if (situationIds.length === 0) {
        return {};
    }

    const situationContents = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:situation-page'],
        filters: { ids: { values: situationIds } },
    }).hits;

    return situationContents.reduce(
        (acc, content) =>
            hasValidCustomPath(content)
                ? { ...acc, [stripPathPrefix(content._path)]: content.data.customPath }
                : acc,
        {}
    );
};

// TODO: rewrite this system
export const buildCustomPathMap = (contentId: string) => {
    const pathMapFromDependencies = getPathMapFromDependencies(contentId);
    const pathMapFromAreasPage = getPathMapForAreaPage(contentId);

    return { ...pathMapFromDependencies, ...pathMapFromAreasPage };
};
