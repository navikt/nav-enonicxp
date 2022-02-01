const graphQlLib = require('/lib/guillotine/graphql');
const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalValue } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
            return runInBranchContext(() => getGlobalValue(gvKey, contentId), 'master');
        },
    };
};

const globalValueWithMathMacroConfigCallback = (context, params) => {
    params.fields.variables = {
        type: graphQlLib.list(graphQlLib.GraphQLFloat),
        resolve: (env) => {
            const keys = forceArray(env.source.keys);

            const variables = runInBranchContext(
                () =>
                    keys.reduce((acc, key) => {
                        const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(key);

                        const value = getGlobalValue(gvKey, contentId);
                        return value ? [...acc, value] : acc;
                    }, []),
                'master'
            );

            // If any specified variables are missing, we return nothing to ensure
            // inconsistent/unintended calculations does not happen
            const hasMissingValues = keys.length !== variables.length;
            return hasMissingValues ? [] : variables;
        },
    };
};

module.exports = {
    globalValueMacroConfigCallback,
    globalValueWithMathMacroConfigCallback,
};
