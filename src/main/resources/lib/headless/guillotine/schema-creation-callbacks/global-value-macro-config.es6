const graphQlLib = require('/lib/guillotine/graphql');
const { getGlobalValue } = require('/lib/global-values/global-values');

const notFoundMsg = '[teknisk feil: verdi ikke tilgjengelig]';

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { key } = env.source;
            const value = getGlobalValue(key, 'textValue');

            return value || notFoundMsg;
        },
    };
};

module.exports = { globalValueMacroConfigCallback };
