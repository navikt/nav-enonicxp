const graphQlLib = require('/lib/guillotine/graphql');
const { getGlobalValue } = require('/lib/global-values/global-values');
const { getGlobalValueContentIdFromMacroKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');

const globalValueCalculatorConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLFloat,
        resolve: (env) => {
            if (!env.source.key) {
                return null;
            }

            const contentId = getGlobalValueContentIdFromMacroKey(env.source.key);
            return runInBranchContext(() => getGlobalValue(contentId), 'master');
        },
    };
};

module.exports = {
    globalValueCalculatorConfigCallback,
};
