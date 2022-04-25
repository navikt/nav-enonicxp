const graphQlLib = require('/lib/guillotine/graphql');
const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/utils/global-value-utils');
const { runInBranchContext } = require('/lib/utils/branch-context');
const { getGlobalValue } = require('/lib/utils/global-value-utils');

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
