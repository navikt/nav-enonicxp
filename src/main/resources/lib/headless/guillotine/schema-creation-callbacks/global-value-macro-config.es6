const graphQlLib = require('/lib/guillotine/graphql');
const { getValueKeyAndContentIdFromMacroKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalNumberValue, getGlobalTextValue } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { valueKey, contentId } = getValueKeyAndContentIdFromMacroKey(env.source.key);

            return runInBranchContext(() => getGlobalTextValue(valueKey, contentId), 'master');
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
                        const { valueKey, contentId } = getValueKeyAndContentIdFromMacroKey(
                            keyAndId
                        );

                        const value = getGlobalNumberValue(valueKey, contentId);
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
