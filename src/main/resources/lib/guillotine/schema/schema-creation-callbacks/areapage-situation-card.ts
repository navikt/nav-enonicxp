import * as contentLib from '/lib/xp/content';
import * as contextLib from '/lib/xp/context';
import { SchemaExtension } from '../../utils/creation-callback-utils';

export const areapageSituationCardPartCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                // This field is only set programmatically, and is not included in the part descriptor
                target: { type: graphQL.reference('Content') },
                // This field is only relevant for Content Studio
                dummyTarget: { type: graphQL.GraphQLID },
            });
        },
    },
    resolvers: {
        [typeName]: {
            target: (env) => {
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
            dummyTarget: () => null,
        },
    },
});
