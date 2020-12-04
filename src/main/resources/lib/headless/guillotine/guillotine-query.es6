const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');
const { runInBranchContext } = require('/lib/headless/run-in-context');
const guillotineHooks = require('/lib/headless/guillotine/guillotine-hooks');
const sectionPageDataCallback = require('/lib/headless/guillotine/schema-creation-callbacks/section-page-data');

guillotineHooks();

const schema = guillotineLib.createSchema({
    creationCallbacks: {
        no_nav_navno_SectionPage_Data: sectionPageDataCallback,
    },
});

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
