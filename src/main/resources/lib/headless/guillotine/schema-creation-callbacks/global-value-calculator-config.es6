const graphQlLib = require('/lib/guillotine/graphql');
const { getGlobalValue } = require('/lib/global-values/global-values');
const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');

const globalValueCalculatorConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLFloat,
        resolve: (env) => {
            if (!env.source.key) {
                return null;
            }

            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
            return runInBranchContext(() => getGlobalValue(gvKey, contentId), 'master');
        },
    };
};

module.exports = {
    globalValueCalculatorConfigCallback,
};
