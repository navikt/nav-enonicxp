import { GraphQLResolverCallback } from '/lib/graphql';
import { getContentList } from '../../../../contentlists/contentlists';

// Sorts and slices content lists
export const contentListResolver =
    (
        contentListKey: string,
        maxItemsKey: string,
        sortByKey: string
    ): GraphQLResolverCallback<any, any> =>
    (env) => {
        const contentListId = env.source[contentListKey];
        if (!contentListId) {
            return null;
        }

        return getContentList(contentListId, env.source[maxItemsKey], sortByKey);
    };
