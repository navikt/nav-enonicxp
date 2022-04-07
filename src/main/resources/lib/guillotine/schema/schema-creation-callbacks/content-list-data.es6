const graphQlLib = require('/lib/guillotine/graphql');

const contentListDataCallback = (context, params) => {
    params.fields.sortedBy = {
        type: graphQlLib.GraphQLString,
    };
};

module.exports = { contentListDataCallback };
