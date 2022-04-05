const graphQlLib = require('/lib/graphql');
const { runInBranchContext } = require('/lib/utils/branch-context');

const schema = require('/lib/headless/guillotine/guillotine-schema');

const guillotineQuery = (query, params, branch = 'master') => {
    const queryResponse = runInBranchContext(
        () => graphQlLib.execute(schema, query, params),
        branch
    );

    const { data, errors } = queryResponse;

    if (errors) {
        throw new Error(
            `GraphQL errors for ${JSON.stringify(params)}: ${errors
                .map((error) => error.message)
                .join(' :: ')}`
        );
    }

    return data?.guillotine;
};

module.exports = { guillotineQuery, guillotineSchema: schema };
