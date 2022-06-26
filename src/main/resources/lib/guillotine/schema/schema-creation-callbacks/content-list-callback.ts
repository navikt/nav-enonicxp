import { contentListResolver } from './common/content-list-resolver';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const contentListCallback =
    (contentListField: string, maxItemsKey: string, sortByKey?: string): CreationCallback =>
    (context, params) => {
        params.fields[contentListField].resolve = contentListResolver(
            contentListField,
            maxItemsKey,
            sortByKey
        );
    };
