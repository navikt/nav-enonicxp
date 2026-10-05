import { SchemaExtension } from '../../utils/creation-callback-utils';
import { contentListResolver } from './common/content-list-resolver';

export const sectionPageDataCallback: SchemaExtension = (graphQL, typeName) => ({
    resolvers: {
        [typeName]: {
            newsContents: contentListResolver('newsContents', 'nrNews', 'publish.from'),
            ntkContents: contentListResolver('ntkContents', 'nrNTK'),
            scContents: contentListResolver('scContents', 'nrSC'),
        },
    },
});
