const contentLib = require('/lib/xp/content');
const utils = require('/lib/nav-utils');

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const sortByLastModifiedDesc = (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a);

// Sorts and slices content lists
const contentListResolver = (contentListName, maxItemsName, sortFunc = undefined) => (env) => {
    const contentListId = env.source[contentListName];
    const maxItems = env.source[maxItemsName];
    const contentList = contentLib.get({ key: contentListId });

    const sectionContentsRefs = utils.forceArray(contentList?.data?.sectionContents);
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

const sectionPageDataCallback = (context, params) => {
    params.fields.newsContents.resolve = contentListResolver(
        'newsContents',
        'nrNews',
        sortByLastModifiedDesc
    );
    params.fields.ntkContents.resolve = contentListResolver('ntkContents', 'nrNTK');
    params.fields.scContents.resolve = contentListResolver('scContents', 'nrSC');
};

module.exports = sectionPageDataCallback;
