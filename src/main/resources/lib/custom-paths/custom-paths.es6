const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');

const validCustomPathPattern = new RegExp('^/[0-9a-z-]+$');

const isValidCustomPath = (path) => path && validCustomPathPattern.test(path);

const getContentWithCustomPath = (path) =>
    runInBranchContext(
        () =>
            contentLib.query({
                start: 0,
                count: 2,
                filters: {
                    boolean: {
                        must: {
                            hasValue: {
                                field: 'data.customPublicPath',
                                values: [path.replace('/www.nav.no', '')],
                            },
                        },
                    },
                },
            }).hits,
        'master'
    );

// Looks for content where 'path' is set as a valid custom public-facing path
// and returns the actual content path
const getInternalContentPath = (path) => {
    if (!isValidCustomPath(path)) {
        return path;
    }

    const content = getContentWithCustomPath(path);

    if (content.length === 0) {
        return path;
    }

    if (content.length > 1) {
        log.error(`Custom public path ${path} exists on multiple content objects!`);
        return path;
    }

    return content[0]._path;
};

const getPathMapForReferences = (contentId) =>
    contentLib.getOutboundDependencies({ key: contentId }).reduce((pathMapAcc, dependencyId) => {
        const dependencyContent = contentLib.get({ key: dependencyId });
        const customPath = dependencyContent?.data?.customPublicPath;

        if (isValidCustomPath(customPath)) {
            return {
                ...pathMapAcc,
                [dependencyContent._path.replace('/www.nav.no', '')]: customPath,
            };
        }
        return pathMapAcc;
    }, {});

module.exports = {
    getInternalContentPath,
    getPathMapForReferences,
    getContentWithCustomPath,
    isValidCustomPath,
};
