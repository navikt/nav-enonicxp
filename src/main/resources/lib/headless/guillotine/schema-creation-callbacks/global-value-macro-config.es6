const graphQlLib = require('/lib/guillotine/graphql');
const { getGlobalNumberValue, getGlobalTextValue } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            return getGlobalTextValue(env.source.key);
        },
    };
};

const globalValueWithMathMacroConfigCallback = (context, params) => {
    params.fields.variables = {
        type: graphQlLib.list(graphQlLib.GraphQLFloat),
        resolve: (env) => {
            const keys = forceArray(env.source.keys);
            const variables = keys.reduce((acc, key) => {
                const value = getGlobalNumberValue(key);
                return value ? [...acc, value] : acc;
            }, []);

            // If any specified variables are missing, we return nothing to ensure
            // inconsistent/unintended calculations does not happen
            const hasMissingValues = keys.length !== variables.length;
            return hasMissingValues ? [] : variables;
        },
    };
};

module.exports = { globalValueMacroConfigCallback, globalValueWithMathMacroConfigCallback };
