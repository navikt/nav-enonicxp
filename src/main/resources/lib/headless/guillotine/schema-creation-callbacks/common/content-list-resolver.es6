const contentLib = require('/lib/xp/content');
const utils = require('/lib/nav-utils');

// Sorts and slices content lists
const contentListResolver = (contentListKey, maxItemsKey, sortFunc = undefined) => (env) => {
    const contentListId = env.source[contentListKey];
    if (!contentListId) {
        return null;
    }

    const maxItems = env.source[maxItemsKey];

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

module.exports = { contentListResolver };
