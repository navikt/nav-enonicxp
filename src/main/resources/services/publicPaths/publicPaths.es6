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
    const contentWithPublicPath = runInBranchContext(
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
                                    field: 'data.publicPath',
                                },
                            },
                        ],
                    },
                },
            }).hits,
        'master'
    );

    const internalPathToPublicPathMap = contentWithPublicPath.reduce(
        (acc, content) => ({ ...acc, [content._path]: content.data.publicPath }),
        {}
    );

    return {
        status: 200,
        body: internalPathToPublicPathMap,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
