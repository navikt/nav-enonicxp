const contentLib = require('/lib/xp/content');
const utils = require('/lib/nav-utils');
const { sortByDateTimeField } = require('/lib/headless/sort');

// Sorts and slices content lists
const contentListResolver = (contentListKey, maxItemsKey, sortByField) => (env) => {
    const contentListId = env.source[contentListKey];
    if (!contentListId) {
        return null;
    }

    const contentList = contentLib.get({ key: contentListId });

    if (!contentList) {
        return null;
    }

    const sectionContentsRefs = utils.forceArray(contentList?.data?.sectionContents);
    const maxItems = env.source[maxItemsKey];
    const sortFunc = sortByField ? sortByDateTimeField(sortByField) : undefined;

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
            ...(sortByField && { dateLabelKey: sortByField }),
        },
    };
};

module.exports = { contentListResolver };
