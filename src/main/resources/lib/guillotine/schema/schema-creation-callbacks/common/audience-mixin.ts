import graphQlLib from '/lib/graphql';
import { CreationCallback } from 'lib/guillotine/utils/creation-callback-utils';

export const audienceCallback: CreationCallback = (context, params) => {
    params.fields._selected = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            if (typeof env.source === 'string') {
                return env.source;
            }

            return env.source._selected;
        },
    };
};
