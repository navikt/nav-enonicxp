import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import contextLib from '/lib/xp/context';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const areapageSituationCardPartCallback: CreationCallback = (context, params) => {
    // This field is only set programmatically, and is not included in the part descriptor
    params.fields.target = {
        type: graphQlLib.reference('Content'),
        resolve: (env) => {
            const { target, disabled } = env.source;
            if (!target) {
                return null;
            }

            // We don't need to resolve disabled situation cards from master
            // as they will not be included in the response anyway
            if (disabled && contextLib.get().branch === 'master') {
                return null;
            }

            return contentLib.get({ key: target });
        },
    };

    // This field is only relevant for Content Studio
    params.fields.dummyTarget = {
        type: graphQlLib.GraphQLID,
        resolve: () => null,
    };
};
