import contentLib from '/lib/xp/content';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const internalLinkCallback: CreationCallback = (context: any, params) => {
    // Resolve target
    params.fields.data.resolve = (env) => {

        if (!env.source.target) {
            return null;
        }
        const content = contentLib.get({ key: env.source.target._id });
        if (!content) {
            return null;
        }
        return content;
    }
};
