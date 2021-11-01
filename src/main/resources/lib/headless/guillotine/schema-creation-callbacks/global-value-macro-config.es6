const graphQlLib = require('/lib/graphql');
const { getGlobalValue } = require('/lib/global-values/global-values');
const { getGlobalValueContentIdFromMacroKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { forceArray } = require('/lib/nav-utils');

const getValueFromLegacyKey = (key) => {
    log.info(`GV macro key (old): ${key}`);

    const contentId = getGlobalValueContentIdFromMacroKey(key);
    return runInBranchContext(() => getGlobalValue(contentId), 'master');
};

const getMathVariablesFromLegacyKeys = (keys) => {
    const variables = runInBranchContext(
        () =>
            keys.reduce((acc, key) => {
                const value = getValueFromLegacyKey(key);
                return value ? [...acc, value] : acc;
            }, []),
        'master'
    );

    // If any specified variables are missing, we return nothing to ensure
    // inconsistent/unintended calculations does not happen
    const hasMissingValues = keys.length !== variables.length;

    return hasMissingValues ? [] : variables;
};

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { key, value } = env.source;

            if (key) {
                return getValueFromLegacyKey(key);
            }

            return getGlobalValue(value);
        },
    };
};

const globalValueWithMathMacroConfigCallback = (context, params) => {
    params.fields.variables = {
        type: graphQlLib.list(graphQlLib.GraphQLFloat),
        resolve: (env) => {
            const { keys, variables } = env.source;

            if (keys) {
                return getMathVariablesFromLegacyKeys(forceArray(keys));
            }

            if (!variables) {
                return [];
            }

            const values = forceArray(variables).reduce((acc, valueContent) => {
                const value = getGlobalValue(valueContent._id);

                return value ? [...acc, value] : acc;
            }, []);

            log.info(`Values for math macro: ${JSON.stringify(values)}`);

            return values;
        },
    };
};

module.exports = {
    globalValueMacroConfigCallback,
    globalValueWithMathMacroConfigCallback,
};
