import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import contextLib from '/lib/xp/context';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const areapageSituationCardPartCallback: CreationCallback = (context, params) => {
    params.fields.target = {
        type: graphQlLib.reference('Content'),
        resolve: (env) => {
            const { target, disabled } = env.source;
            if (!target) {
                return null;
            }

            // Do not return disabled situation cards from master
            // For draft, we still want to show them in the editor
            if (disabled && contextLib.get().branch === 'master') {
                return null;
            }

            return contentLib.get({ key: target });
        },
    };

    params.fields.dummyTarget = {
        type: graphQlLib.GraphQLID,
        resolve: () => null,
    };
};
