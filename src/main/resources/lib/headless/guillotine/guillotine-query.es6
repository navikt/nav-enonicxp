const graphQlLib = require('/lib/graphql');
const { runInBranchContext } = require('/lib/utils/branch-context');

const schema = require('/lib/headless/guillotine/guillotine-schema');

const guillotineQuery = (query, params, branch = 'master', throwOnErrors = false) => {
    const queryResponse = runInBranchContext(
        () => graphQlLib.execute(schema, query, params),
        branch
    );

    const { data, errors } = queryResponse;

    if (errors) {
        const errorMsg = `GraphQL errors for ${JSON.stringify(params)}: ${errors
            .map((error) => error.message)
            .join(' :: ')}`;

        if (throwOnErrors) {
            throw new Error(
                `GraphQL errors for ${JSON.stringify(params)}: ${errors
                    .map((error) => error.message)
                    .join(' :: ')}`
            );
        } else {
            log.error(errorMsg);
        }
    }

    return data?.guillotine;
};

module.exports = { guillotineQuery, guillotineSchema: schema };
