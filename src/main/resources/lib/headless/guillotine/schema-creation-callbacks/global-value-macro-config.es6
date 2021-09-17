const graphQlLib = require('/lib/guillotine/graphql');
const { getValueKeyAndSetIdFromMacroKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalNumberValue, getGlobalTextValue } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { valueKey, setId } = getValueKeyAndSetIdFromMacroKey(env.source.key);
            return runInBranchContext(() => getGlobalTextValue(valueKey, setId), 'master');
        },
    };
};

const globalValueWithMathMacroConfigCallback = (context, params) => {
    params.fields.variables = {
        type: graphQlLib.list(graphQlLib.GraphQLFloat),
        resolve: (env) => {
            const macroKeys = forceArray(env.source.keys);

            const variables = runInBranchContext(
                () =>
                    macroKeys.reduce((acc, keyAndId) => {
                        const { valueKey, setId } = getValueKeyAndSetIdFromMacroKey(keyAndId);

                        const value = getGlobalNumberValue(valueKey, setId);
                        return value ? [...acc, value] : acc;
                    }, []),
                'master'
            );

            // If any specified variables are missing, we return nothing to ensure
            // inconsistent/unintended calculations does not happen
            const hasMissingValues = macroKeys.length !== variables.length;
            return hasMissingValues ? [] : variables;
        },
    };
};

module.exports = {
    globalValueMacroConfigCallback,
    globalValueWithMathMacroConfigCallback,
};
