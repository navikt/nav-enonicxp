const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql');
const { htmlCleanUp } = require('./common/html-cleanup');

const mainArticleDataCallback = (context, params) => {
    params.fields.chapters = {
        type: graphQlLib.list(graphQlLib.reference('Content')),
    };

    const textResolverOld = params.fields.text.resolve;
    const factResolverOld = params.fields.fact.resolve;

    // Resolve html-fields in data-object
    params.fields.text.resolve = (env) => {
        const result = textResolverOld(env);
        return result ? htmlCleanUp(result) : '';
    };
    params.fields.fact.resolve = (env) => {
        const result = factResolverOld(env);
        return result ? htmlCleanUp(result) : '';
    };
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
