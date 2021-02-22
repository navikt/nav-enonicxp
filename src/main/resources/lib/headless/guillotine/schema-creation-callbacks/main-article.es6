const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql');
const { htmlCleanUp } = require('./common/html-cleanup');

const mainArticleDataCallback = (context, params) => {
    params.fields.chapters = {
        type: graphQlLib.list(graphQlLib.reference('Content')),
    };
};

const mainArticleCallback = (context, params) => {
    params.fields.data.resolve = (env) => {
        // Resolve html-fields in data-object
        const data = env.source?.data;
        const text = data?.text ? htmlCleanUp(data.text) : '';
        const fact = data?.fact ? htmlCleanUp(data.fact) : '';

        // Resolve chapters
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
            text,
            fact,
        };
    };
};

module.exports = { mainArticleCallback, mainArticleDataCallback };
