const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');

const includedContentTypes = [
    'dynamic-page',
    'content-page-with-sidemenus',
    'situation-page',
    'main-article',
    'section-page',
    'page-list',
    'office-information',
].map((contentType) => `${app.name}:${contentType}`);

const validCustomPathPattern = new RegExp('^/[0-9a-z-]+$');

const isValidCustomPath = (path) => path && validCustomPathPattern.test(path);

const getContentWithCustomPath = (path) =>
    runInBranchContext(
        () =>
            contentLib.query({
                start: 0,
                count: 2,
                contentTypes: includedContentTypes,
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
    contentLib
        .getOutboundDependencies({ key: contentId })
        .map((dependencyId) => contentLib.get({ key: dependencyId }))
        .reduce((acc, item) => {
            if (isValidCustomPath(item?.data?.customPublicPath)) {
                return {
                    ...acc,
                    [item._path.replace('/www.nav.no', '')]: item.data.customPublicPath,
                };
            }
            return acc;
        }, undefined);

module.exports = {
    getInternalContentPath,
    getPathMapForReferences,
    getContentWithCustomPath,
    isValidCustomPath,
};
