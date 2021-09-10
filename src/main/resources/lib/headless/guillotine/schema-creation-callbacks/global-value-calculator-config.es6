const graphQlLib = require('/lib/guillotine/graphql');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalNumberValue } = require('/lib/global-values/global-values');

const globalValueCalculatorConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLFloat,
        resolve: (env) => {
            return runInBranchContext(() => getGlobalNumberValue(env.source.key));
        },
    };
};

module.exports = {
    globalValueCalculatorConfigCallback,
};
