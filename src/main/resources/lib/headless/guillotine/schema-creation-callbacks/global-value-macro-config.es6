const graphQlLib = require('/lib/guillotine/graphql');
const { forceArray } = require('/lib/nav-utils');
const { getGlobalValue } = require('/lib/global-values/global-values');

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            return getGlobalValue(env.source.key, 'textValue');
        },
    };
};

const globalValueWithMathMacroConfigCallback = (context, params) => {
    params.fields.variables = {
        type: graphQlLib.list(graphQlLib.GraphQLFloat),
        resolve: (env) => {
            const variables = forceArray(env.source.keys).reduce((acc, key) => {
                const value = getGlobalValue(key, 'numberValue');
                return value ? [...acc, value] : acc;
            }, []);

            return variables || [];
        },
    };
};

module.exports = { globalValueMacroConfigCallback, globalValueWithMathMacroConfigCallback };
