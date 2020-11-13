const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');
const { runInBranchContext } = require('/lib/headless-utils/run-in-context');

const schema = guillotineLib.createSchema();

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

module.exports = guillotineQuery;
