import { CreationCallback } from '../../utils/creation-callback-utils';
import { contentListResolver } from './common/content-list-resolver';

export const pressLandingPageDataCallback: CreationCallback = (context, params) => {
    params.fields.shortcuts.resolve = contentListResolver('shortcuts', 'maxShortcutsCount');
    params.fields.pressNews.resolve = contentListResolver(
        'pressNews',
        'maxNewsCount',
        'publish.from'
    );
};
