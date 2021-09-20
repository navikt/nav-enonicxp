const graphQlLib = require('/lib/guillotine/graphql');
const { getValueKeyAndcontentIdFromMacroKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalNumberValue } = require('/lib/global-values/global-values');

const globalValueCalculatorConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLFloat,
        resolve: (env) => {
            if (!env.source.key) {
                log.info(`null key in calculator ${env.source.key}`);
                return null;
            }
            const { valueKey, contentId } = getValueKeyAndcontentIdFromMacroKey(env.source.key);
            return runInBranchContext(() => getGlobalNumberValue(valueKey, contentId), 'master');
        },
    };
};

module.exports = {
    globalValueCalculatorConfigCallback,
};
