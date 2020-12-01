const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');
const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless-utils/run-in-context');

require('/lib/headless-utils/guillotine-sorting-hook');

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const sortByLastModifiedDesc = (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a);

// Retrieves nested object value from '.'-delimited string path
const deepValue = (obj, path) =>
    path.split('.').reduce((acc, key) => acc && typeof acc === 'object' && acc[key], obj) ||
    undefined;

// Sorts and slices content lists
const contentListResolver = (contentListPath, maxItemsPath, sortFunc = undefined) => (env) => {
    const contentListId = deepValue(env.source, contentListPath);
    const maxItems = deepValue(env.source, maxItemsPath);
    log.info(`contentlistid: ${contentListId}`);
    log.info(`maxitems: ${maxItems}`);

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
        PartComponentDataApplicationConfig: (context, params) => {
            params.fields.dynamic_news_list.resolve = contentListResolver(
                'dynamic_news_list.contentList.target',
                'dynamic_news_list.contentList.numLinks'
            );
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
