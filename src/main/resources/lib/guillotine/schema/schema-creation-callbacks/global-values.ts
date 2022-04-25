import graphQlLib, { GraphQLResolver } from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';

export const globalValuesCallback: CreationCallback = (context, params) => {
    const valueItems: GraphQLResolver = {
        resolve: (env) => {
            return env.source.valueItems ? forceArray(env.source.valueItems) : null;
        },
        type: graphQlLib.list(
            graphQlCreateObjectType({
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

    if (params.fields.data) {
        // @ts-ignore (Guillotine/GraphQL typedefs does not account for nested fields)
        params.fields.data.valueItems = valueItems;
    } else {
        params.fields.data = {
            type: graphQlCreateObjectType({
                name: context.uniqueName('no_nav_navno_GlobalValueSet_Data'),
                description: 'Data for globale verdier',
                fields: {
                    valueItems: valueItems,
                },
            }),
        };
    }
};
