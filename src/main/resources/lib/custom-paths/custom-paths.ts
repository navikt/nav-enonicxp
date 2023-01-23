import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { stripPathPrefix as _stripPathPrefix } from '../utils/nav-utils';
import { logger } from '../utils/logging';

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

    return runInContext(
        { branch: 'master' },
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
            }).hits
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
        logger.critical(
            `Custom public path ${path} exists on multiple content objects!`,
            false,
            true
        );
        return null;
    }

    return content[0]._path;
};
