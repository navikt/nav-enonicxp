const graphQlLib = require('/lib/guillotine/graphql');
const { globalValueMacroDescriptionSeparator } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalNumberValue, getGlobalTextValue } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');

const getKeyWithoutDescription = (key) => key?.split(globalValueMacroDescriptionSeparator)[0];

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const key = getKeyWithoutDescription(env.source.key);

            return runInBranchContext(() => getGlobalTextValue(key), 'master');
        },
    };
};

const globalValueWithMathMacroConfigCallback = (context, params) => {
    params.fields.variables = {
        type: graphQlLib.list(graphQlLib.GraphQLFloat),
        resolve: (env) => {
            const keys = forceArray(env.source.keys).map(getKeyWithoutDescription);
            const variables = runInBranchContext(
                () =>
                    keys.reduce((acc, key) => {
                        const value = getGlobalNumberValue(key);
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
