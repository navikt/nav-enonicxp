import { CreationCallback } from '../../utils/creation-callback-utils';
import { contentListResolver } from './common/content-list-resolver';

export const sectionPageDataCallback: CreationCallback = (context, params) => {
    params.fields.newsContents.resolve = contentListResolver(
        'newsContents',
        'nrNews',
        'publish.first'
    );
    params.fields.ntkContents.resolve = contentListResolver('ntkContents', 'nrNTK');
    params.fields.scContents.resolve = contentListResolver('scContents', 'nrSC');
};
