const graphQlLib = require('/lib/guillotine/graphql');

const contentListDataCallback = (context, params) => {
    params.fields.dateLabelKey = {
        type: graphQlLib.GraphQLString,
    };
};

module.exports = { contentListDataCallback };
