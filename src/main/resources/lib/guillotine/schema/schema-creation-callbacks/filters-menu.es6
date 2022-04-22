const graphQlLib = require('/lib/guillotine/graphql.js');

const filterCallback = (context, params) => {
    params.fields.id = {
        type: graphQlLib.GraphQLString,
    };
};

module.exports = { filterCallback };
