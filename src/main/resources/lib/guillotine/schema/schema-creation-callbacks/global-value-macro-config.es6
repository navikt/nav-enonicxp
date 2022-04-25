const graphQlLib = require('/lib/guillotine/graphql');
const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/utils/global-value-utils');
const { runInBranchContext } = require('/lib/utils/branch-context');
const { getGlobalValue } = require('/lib/utils/global-value-utils');
const { forceArray } = require('/lib/utils/nav-utils');

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
