import { CreationCallback } from 'lib/guillotine/utils/creation-callback-utils';

export const audienceCallback: CreationCallback = (context, params) => {
    if (!params.fields.audience) {
        return null;
    }
    params.fields.audience.resolve = (env) => {
        if (!env.source.audience['_selected']) {
            env.source.audience = {
                _selected: env.source.audience,
            };
        }
    };
};
