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

const handleGet = () => {
    const contentsWithCustomPublicPath = runInBranchContext(
        () =>
            contentLib.query({
                start: 0,
                count: 10000,
                contentTypes: includedContentTypes,
                filters: {
                    boolean: {
                        must: [
                            {
                                exists: {
                                    field: 'data.customPublicPath',
                                },
                            },
                        ],
                    },
                },
            }).hits,
        'master'
    );

    const internalPathToPublicPathMap = contentsWithCustomPublicPath.reduce(
        (acc, content) => ({
            ...acc,
            [content._path.replace('/www.nav.no', '')]: content.data.customPublicPath,
        }),
        {}
    );

    return {
        status: 200,
        body: internalPathToPublicPathMap,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
