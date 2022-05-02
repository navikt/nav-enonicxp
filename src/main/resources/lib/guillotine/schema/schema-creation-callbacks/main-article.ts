import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const mainArticleDataCallback: CreationCallback = (context, params) => {
    params.fields.chapters = {
        type: graphQlLib.list(graphQlLib.reference('Content')),
    };
};

export const mainArticleCallback: CreationCallback = (context, params) => {
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
