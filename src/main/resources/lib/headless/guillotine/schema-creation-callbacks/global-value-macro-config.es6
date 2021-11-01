const graphQlLib = require('/lib/graphql');
const { getGlobalValue } = require('/lib/global-values/global-values');
const { getGlobalValueContentIdFromMacroKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { forceArray } = require('/lib/nav-utils');

const getValue = (key) => {
    const contentId = getGlobalValueContentIdFromMacroKey(key);
    return runInBranchContext(() => getGlobalValue(contentId), 'master');
};

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { key } = env.source;

            if (key) {
                return getValue(key);
            }

            return null;
        },
    };
};

const globalValueWithMathMacroConfigCallback = (context, params) => {
    params.fields.variables = {
        type: graphQlLib.list(graphQlLib.GraphQLFloat),
        resolve: (env) => {
            const { keys } = env.source;

            if (keys) {
                const variables = runInBranchContext(
                    () =>
                        forceArray(keys).reduce((acc, key) => {
                            const value = getValue(key);
                            return value ? [...acc, value] : acc;
                        }, []),
                    'master'
                );

                // If any specified variables are missing, we return nothing to ensure
                // inconsistent/unintended calculations does not happen
                const hasMissingValues = keys.length !== variables.length;

                return hasMissingValues ? [] : variables;
            }

            return null;
        },
    };
};

module.exports = {
    globalValueMacroConfigCallback,
    globalValueWithMathMacroConfigCallback,
};
