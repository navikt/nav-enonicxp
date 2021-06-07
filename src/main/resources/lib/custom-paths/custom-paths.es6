const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');

const validCustomPathPattern = new RegExp('^/[0-9a-z-]+$');

const isValidCustomPath = (path) => path && validCustomPathPattern.test(path);

const xpPathToPathname = (xpPath) => xpPath.replace(/^\/www\.nav\.no/, '');

// If the requested path
const shouldRedirectToCustomPath = (content, requestedPathOrId, branch) => {
    const customPath = content.data?.customPath;

    return (
        customPath &&
        isValidCustomPath(customPath) &&
        xpPathToPathname(requestedPathOrId) !== customPath &&
        branch === 'master'
    );
};

const getContentWithCustomPath = (path) => {
    log.info(`path: ${xpPathToPathname(path)}`);
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
                                values: [xpPathToPathname(path)],
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
const getInternalContentPathFromCustomPath = (xpPath) => {
    const path = xpPathToPathname(xpPath);
    if (!isValidCustomPath(path)) {
        return null;
    }

    const content = getContentWithCustomPath(path);

    if (content.length === 0) {
        return null;
    }

    if (content.length > 1) {
        log.error(`Custom public path ${path} exists on multiple content objects!`);
        return null;
    }

    return content[0]._path;
};

const getPathMapForReferences = (contentId) =>
    contentLib.getOutboundDependencies({ key: contentId }).reduce((pathMapAcc, dependencyId) => {
        const dependencyContent = contentLib.get({ key: dependencyId });
        const customPath = dependencyContent?.data?.customPath;

        if (isValidCustomPath(customPath)) {
            return {
                ...pathMapAcc,
                [xpPathToPathname(dependencyContent._path)]: customPath,
            };
        }
        return pathMapAcc;
    }, {});

module.exports = {
    getInternalContentPathFromCustomPath,
    getPathMapForReferences,
    getContentWithCustomPath,
    isValidCustomPath,
    shouldRedirectToCustomPath,
};
