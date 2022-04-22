const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql');

const mainArticleDataCallback = (context, params) => {
    params.fields.chapters = {
        type: graphQlLib.list(graphQlLib.reference('Content')),
    };
};

const mainArticleCallback = (context, params) => {
    params.fields.data.resolve = (env) => {
        // Resolve chapters
        const chapters = contentLib.query({
            query: `_parentPath = '/content${env.source._path}'`,
            start: 0,
            count: 100,
            contentTypes: ['no.nav.navno:main-article-chapter'],
            sort: env.source.childOrder || 'displayname ASC',
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
            ...env.source?.data,
            ...(chapters.length > 0 && { chapters }),
        };
    };
};

module.exports = { mainArticleCallback, mainArticleDataCallback };
