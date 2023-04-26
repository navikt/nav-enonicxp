import { CreationCallback } from 'lib/guillotine/utils/creation-callback-utils';

export const audienceCallback: CreationCallback = (context, params) => {
    if (!params.fields.audience) {
        return null;
    }
    params.fields.audience.resolve = (env) => {
        if (typeof env.source.audience === 'string') {
            return {
                _selected: env.source.audience,
                provider_audience: null,
            };
        }
        return env.source.audience;
    };
};
