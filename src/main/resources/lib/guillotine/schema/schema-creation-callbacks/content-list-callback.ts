import { contentListResolver } from './common/content-list-resolver';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const contentListCallback =
    (contentListField: string, maxItemsKey: string, sortByKey?: string): CreationCallback =>
    (context, params) => {
        params.fields[contentListField].resolve = (env) => {
            const { sortByPublishDate } = env.source;
            const resolvedSortByKey = sortByPublishDate ? 'publish.from' : sortByKey;
            return contentListResolver(contentListField, maxItemsKey, resolvedSortByKey)(env);
        };
    };
