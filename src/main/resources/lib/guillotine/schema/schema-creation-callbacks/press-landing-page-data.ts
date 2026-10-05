import { SchemaExtension } from '../../utils/creation-callback-utils';
import { contentListResolver } from './common/content-list-resolver';

export const pressLandingPageDataCallback: SchemaExtension = (graphQL, typeName) => ({
    resolvers: {
        [typeName]: {
            shortcuts: contentListResolver('shortcuts', 'maxShortcutsCount'),
            pressNews: contentListResolver('pressNews', 'maxNewsCount', 'publish.from'),
        },
    },
});
