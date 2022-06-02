import { CreationCallback } from '../../utils/creation-callback-utils';

export const fragmentComponentDataCallback: CreationCallback = (context, params) => {
    // fragment id is required in the built-in schema, but may be missing if a fragment is added
    // in the editor without selecting an actual fragment. Return a dummy id to ensure both the
    // editor and the graphql schema validator behaves correctly
    params.fields.id.resolve = (env) => {
        return env.source.id || 'error-missing-fragment-id';
    };
};
