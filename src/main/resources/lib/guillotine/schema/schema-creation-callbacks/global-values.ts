import graphQlLib, { GraphQLResolver } from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import {
    GlobalNumberValueItem,
    GlobalNumberValueSetData,
} from '../../../../types/content-types/global-value-set';
import { forceArray } from '../../../utils/array-utils';

export const globalValueSetCallback: CreationCallback = (context, params) => {
    const valueItems: GraphQLResolver = {
        resolve: (env) => {
            return forceArray(env.source.valueItems).map((item) => ({
                ...item,
                // Set the type here for backwards compatibility with values created
                // when we only had one global value type (and this field did not exist)
                type: 'numberValue',
            }));
        },
        type: graphQlLib.list(
            graphQlCreateObjectType<keyof GlobalNumberValueItem>(context, {
                name: context.uniqueName('GlobalValueItem'),
                description: 'Global verdi',
                fields: {
                    key: { type: graphQlLib.GraphQLString },
                    itemName: { type: graphQlLib.GraphQLString },
                    numberValue: { type: graphQlLib.GraphQLFloat },
                    type: { type: graphQlLib.GraphQLString },
                },
            })
        ),
    };

    params.fields.data = {
        type: graphQlCreateObjectType<keyof GlobalNumberValueSetData>(context, {
            name: context.uniqueName('no_nav_navno_GlobalValueSet_Data'),
            description: 'Data for globale verdier',
            fields: { valueItems },
        }),
    };
};
