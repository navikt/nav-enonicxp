import graphQlLib, { GraphQLResolver } from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';

export const globalValueSetCallback: CreationCallback = (context, params) => {
    const valueItems: GraphQLResolver = {
        resolve: (env) => {
            return forceArray(env.source.valueItems);
        },
        type: graphQlLib.list(
            graphQlCreateObjectType(context, {
                name: context.uniqueName('GlobalValueItem'),
                description: 'Global verdi',
                fields: {
                    key: { type: graphQlLib.GraphQLString },
                    itemName: { type: graphQlLib.GraphQLString },
                    numberValue: { type: graphQlLib.GraphQLFloat },
                },
            })
        ),
    };

    params.fields.data = {
        type: graphQlCreateObjectType(context, {
            name: context.uniqueName('no_nav_navno_GlobalValueSet_Data'),
            description: 'Data for globale verdier',
            fields: { valueItems },
        }),
    };
};
