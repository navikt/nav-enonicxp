import { contentListResolver } from './common/content-list-resolver';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const contentListCallback =
    (sortByKey?: string): CreationCallback =>
    (context, params) => {
        params.fields.target.resolve = contentListResolver('target', 'numLinks', sortByKey);
    };
