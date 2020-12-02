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

const partComponentCallback = (context, params) => {
    params.fields.dynamic_news_list.resolve = contentListResolver(
        'dynamic_news_list.contentList.target',
        'dynamic_news_list.contentList.numLinks'
    );
};

module.exports = partComponentCallback;
