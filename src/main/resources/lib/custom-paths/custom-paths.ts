import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInBranchContext } from '../headless/branch-context';

type ContentWithCustomPath = Content<{ customPath: string }>;

const validCustomPathPattern = new RegExp('^/[0-9a-z-/]+$');

const isValidCustomPath = (path: string) =>
    !!path && validCustomPathPattern.test(path);

const xpPathToPathname = (xpPath: string) =>
    xpPath?.replace(/^\/www\.nav\.no/, '');

const hasCustomPath = (
    content: Content<any>
): content is ContentWithCustomPath => {
    return isValidCustomPath(content.data?.customPath);
};

// If the content has a custom path and it is not the requested path
// we should redirect to the custom path
export const shouldRedirectToCustomPath = (
    content: Content<any>,
    requestedPathOrId: string,
    branch: RepoBranch
) => {
    return (
        hasCustomPath(content) &&
        xpPathToPathname(requestedPathOrId) !== content.data.customPath &&
        branch === 'master'
    );
};

export const getCustomPathFromContent = (contentId: string) => {
    const content = contentLib.get({ key: contentId }) as Content<any>;
    return hasCustomPath(content) ? content.data.customPath : null;
};

export const getContentFromCustomPath = (path: string) => {
    const customPath = xpPathToPathname(path);
    if (!isValidCustomPath(customPath)) {
        return [];
    }

    return runInBranchContext(
        () =>
            contentLib.query<ContentWithCustomPath['data']>({
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
    const path = xpPathToPathname(xpPath);
    if (!isValidCustomPath(path)) {
        return null;
    }

    const content = getContentFromCustomPath(path);

    if (content.length === 0) {
        return null;
    }

    if (content.length > 1) {
        log.error(
            `Custom public path ${path} exists on multiple content objects!`
        );
        return null;
    }

    return content[0]._path;
};

export const getPathMapForReferences = (contentId: string) => {
    // getOutboundDependencies throws an error if the key does not exist
    try {
        return contentLib
            .getOutboundDependencies({
                key: contentId,
            })
            .reduce((pathMapAcc, dependencyId) => {
                const dependencyContent = contentLib.get({
                    key: dependencyId,
                }) as Content<any>;

                if (hasCustomPath(dependencyContent)) {
                    return {
                        ...pathMapAcc,
                        [xpPathToPathname(dependencyContent._path)]:
                            dependencyContent.data.customPath,
                    };
                }
                return pathMapAcc;
            }, {});
    } catch (e) {
        return {};
    }
};
