const { getContentList } = require('/lib/contentlists/contentlists');

// Sorts and slices content lists
const contentListResolver = (contentListKey, maxItemsKey, sortByKey) => (env) => {
    const contentListId = env.source[contentListKey];
    if (!contentListId) {
        return null;
    }

    return getContentList(contentListId, env.source[maxItemsKey], sortByKey);
};

module.exports = { contentListResolver };
