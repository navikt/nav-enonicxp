const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');
const contextLib = require('/lib/xp/context');

const schema = guillotineLib.createSchema();

const guillotineQuery = (query, params, branch = 'master') => {
    const queryResponse = contextLib.run(
        {
            repository: 'com.enonic.cms.default',
            branch: branch,
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        () => graphQlLib.execute(schema, query, params)
    );

    const { data, errors } = queryResponse;

    if (errors) {
        log.info('GraphQL errors:');
        errors.forEach((error) => log.info(error.message));
    }

    return data?.guillotine;
};

module.exports = guillotineQuery;
