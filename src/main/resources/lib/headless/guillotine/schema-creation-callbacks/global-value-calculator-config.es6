const graphQlLib = require('/lib/guillotine/graphql');
const { getValueKeyAndSetIdFromMacroKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalNumberValue } = require('/lib/global-values/global-values');

const globalValueCalculatorConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLFloat,
        resolve: (env) => {
            const { valueKey, setId } = getValueKeyAndSetIdFromMacroKey(env.source.key);
            return runInBranchContext(() => getGlobalNumberValue(valueKey, setId), 'master');
        },
    };
};

module.exports = {
    globalValueCalculatorConfigCallback,
};
