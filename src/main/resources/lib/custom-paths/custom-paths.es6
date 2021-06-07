const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');

// Finds content where 'path' is set as a custom public-facing path
// If found, returns the internal path for the content
const getContentPath = (path) => {
    const content = runInBranchContext(
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

    if (content.length === 0) {
        return path;
    }

    if (content.length > 1) {
        log.error(`Public path ${path} exists on multiple content objects!`);
        return path;
    }

    return content[0]._path;
};

const getPathMapForReferences = (contentId) =>
    contentLib
        .getOutboundDependencies({ key: contentId })
        .map((dependencyId) => contentLib.get({ key: dependencyId }))
        .reduce((acc, item) => {
            if (item?.data?.customPublicPath) {
                return { ...acc, [item._path]: item.data.customPublicPath };
            }
            return acc;
        }, undefined);

module.exports = { getContentPath, getPathMapForReferences };
