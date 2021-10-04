const graphQlLib = require('/lib/guillotine/graphql');
const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalNumberValue } = require('/lib/global-values/global-values');

const globalValueCalculatorConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLFloat,
        resolve: (env) => {
            if (!env.source.key) {
                return null;
            }

            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
            return runInBranchContext(() => getGlobalNumberValue(gvKey, contentId), 'master');
        },
    };
};

module.exports = {
    globalValueCalculatorConfigCallback,
};
