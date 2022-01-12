const contentLib = require('/lib/xp/content');
const utils = require('/lib/nav-utils');
const { sortByDateTimeField } = require('/lib/headless/sort');

// Sorts and slices content lists
const getContentList = (contentListKey, maxItemsKey, sortByKey) => {
    const contentList = contentLib.get({ key: contentListKey });
    if (!contentList) {
        return null;
    }
    const sectionContentsRefs = utils.forceArray(contentList?.data?.sectionContents);
    const sortFunc = sortByKey ? sortByDateTimeField(sortByKey) : undefined;
    const sectionContents = sectionContentsRefs
        .map((item) => contentLib.get({ key: item }))
        .filter(Boolean)
        .sort(sortFunc)
        .slice(0, maxItemsKey)
        .map((item) => item._id);

    return {
        ...contentList,
        data: {
            sectionContents,
            ...(sortByKey && { sortedBy: sortByKey }),
        },
    };
};

module.exports = { getContentList };
