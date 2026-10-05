import { FieldResolver } from '../../../utils/creation-callback-utils';
import { getContentList } from '../../../../contentlists/contentlists';

// Sorts and slices content lists
export const contentListResolver =
    (contentListKey: string, maxItemsKey: string, sortByKey?: string): FieldResolver =>
    (env) => {
        const contentListId = env.source[contentListKey];
        if (!contentListId) {
            return null;
        }

        return getContentList(contentListId, env.source[maxItemsKey], sortByKey);
    };
