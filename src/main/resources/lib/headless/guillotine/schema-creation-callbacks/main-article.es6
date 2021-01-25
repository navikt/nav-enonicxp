const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql');
const { htmlCleanUp } = require('./common/html-cleanup');

const mainArticleDataCallback = (context, params) => {
    params.fields.chapters = {
        type: graphQlLib.list(graphQlLib.reference('Content')),
    };

    // Resolve html-fields in data-object
    params.fields.text.resolve = (env) => (env.source.text ? htmlCleanUp(env.source.text) : '');
    params.fields.fact.resolve = (env) => (env.source.fact ? htmlCleanUp(env.source.fact) : '');
};

const mainArticleCallback = (context, params) => {
    params.fields.data.resolve = (env) => {
        const chapters = contentLib.query({
            query: `_parentPath = '/content${env.source._path}'`,
            start: 0,
            count: 100,
            contentTypes: ['no.nav.navno:main-article-chapter'],
            filters: {
                boolean: {
                    must: [
                        {
                            exists: {
                                field: 'data.article',
                            },
                        },
                    ],
                },
            },
        }).hits;

        return {
            ...env.source.data,
            ...(chapters.length > 0 && { chapters }),
        };
    };
};

module.exports = { mainArticleCallback, mainArticleDataCallback };
