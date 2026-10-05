import { contentListResolver } from './common/content-list-resolver';
import { SchemaExtension } from '../../utils/creation-callback-utils';

export const contentListCallback =
    (contentListField: string, maxItemsKey: string, sortByKey?: string): SchemaExtension =>
    (graphQL, typeName) => ({
        resolvers: {
            [typeName]: {
                [contentListField]: (env) => {
                    const { sortByPublishDate } = env.source;
                    const resolvedSortByKey = sortByPublishDate ? 'publish.from' : sortByKey;
                    return contentListResolver(
                        contentListField,
                        maxItemsKey,
                        resolvedSortByKey
                    )(env);
                },
            },
        },
    });
