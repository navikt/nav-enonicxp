import * as contentLib from '/lib/xp/content';
import { SchemaExtension } from '../../utils/creation-callback-utils';

export const mainArticleDataCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                chapters: { type: graphQL.list(graphQL.reference('Content')) },
            });
        },
    },
});

export const mainArticleCallback: SchemaExtension = (graphQL, typeName) => ({
    resolvers: {
        [typeName]: {
            data: (env) => {
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
            },
        },
    },
});
