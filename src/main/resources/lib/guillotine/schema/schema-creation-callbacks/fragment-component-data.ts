import * as contentLib from '/lib/xp/content';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';

const DUMMY_ID = 'error-missing-fragment-id';

export const fragmentComponentDataCallback: CreationCallback = (context, params) => {
    // fragment id is required in the built-in schema, but may be missing if a fragment is added
    // in the editor without selecting an actual fragment. Return a dummy id to ensure both the
    // editor and the graphql schema validator behaves correctly
    params.fields.id.resolve = (env) => {
        return env.source.id || DUMMY_ID;
    };

    params.fields.fragment.resolve = (env) => {
        logger.info(`Fragment: ${JSON.stringify(env.source)}`);

        const { id } = env.source;

        if (!id) {
            return null;
        }

        const content = contentLib.get(id);

        if (!content) {
            logger.critical(`Invalid fragment reference: ${env.source.id}`, true, true);
        }

        return content;
    };
};
