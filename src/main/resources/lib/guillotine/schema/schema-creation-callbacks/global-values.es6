const graphQlLib = require('/lib/guillotine/graphql');
const { forceArray } = require('/lib/utils/nav-utils');

const globalValuesCallback = (context, params) => {
    const valueItems = {
        resolve: (env) => {
            return env.source.valueItems ? forceArray(env.source.valueItems) : null;
        },
        type: graphQlLib.list(
            graphQlLib.createObjectType(context, {
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
        params.fields.data.valueItems = valueItems;
    } else {
        params.fields.data = {
            type: graphQlLib.createObjectType(context, {
                name: context.uniqueName('no_nav_navno_GlobalValueSet_Data'),
                description: 'Data for globale verdier',
                fields: {
                    valueItems: valueItems,
                },
            }),
        };
    }
};

module.exports = { globalValuesCallback };
