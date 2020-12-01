const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');
const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless-utils/run-in-context');

require('/lib/headless-utils/guillotine-sorting-hook');

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const sortByLastModifiedDesc = (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a);

// Sorts and slices content lists
const contentListResolver = (contentListName, maxItemsName, sortFunc = undefined) => (env) => {
    const contentListId = env.source[contentListName];
    const maxItems = env.source[maxItemsName];

    const contentList = contentLib.get({ key: contentListId });
    const sectionContentsRefs = contentList?.data?.sectionContents;

    if (!Array.isArray(sectionContentsRefs)) {
        return undefined;
    }

    const sectionContents = sectionContentsRefs
        .map((item) => contentLib.get({ key: item }))
        .filter(Boolean)
        .sort(sortFunc)
        .slice(0, maxItems)
        .map((item) => item._id);

    return {
        ...contentList,
        data: {
            sectionContents,
        },
    };
};

const schema = guillotineLib.createSchema({
    creationCallbacks: {
        no_nav_navno_SectionPage_Data: (context, params) => {
            params.fields.newsContents.resolve = contentListResolver(
                'newsContents',
                'nrNews',
                sortByLastModifiedDesc
            );

            params.fields.ntkContents.resolve = contentListResolver('ntkContents', 'nrNTK');

            params.fields.scContents.resolve = contentListResolver('scContents', 'nrSC');
        },
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

module.exports = guillotineQuery;
