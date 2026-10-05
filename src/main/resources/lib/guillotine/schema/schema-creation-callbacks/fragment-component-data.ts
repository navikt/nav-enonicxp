import { SchemaExtension } from '../../utils/creation-callback-utils';

export const fragmentComponentDataCallback: SchemaExtension = (graphQL, typeName) => ({
    resolvers: {
        [typeName]: {
            // fragment id is required in the built-in schema, but may be missing if a fragment is added
            // in the editor without selecting an actual fragment. Return a dummy id to ensure both the
            // editor and the graphql schema validator behaves correctly
            id: (env) => env.source.id || 'error-missing-fragment-id',
        },
    },
});
