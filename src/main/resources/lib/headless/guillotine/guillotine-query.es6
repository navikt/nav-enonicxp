const graphQlLib = require('/lib/graphql');
const { runInBranchContext } = require('/lib/headless/run-in-context');

const schema = require('/lib/headless/guillotine/guillotine-schema');

const guillotineQuery = (query, params, branch = 'master') => {
    const queryResponse = runInBranchContext(
        () => graphQlLib.execute(schema, query, params),
        branch
    );

    const { data, errors } = queryResponse;

    if (errors) {
        log.error('GraphQL errors:');
        errors.forEach((error) => log.error(error.message));
    }

    return data?.guillotine;
};

module.exports = { guillotineQuery, guillotineSchema: schema };
