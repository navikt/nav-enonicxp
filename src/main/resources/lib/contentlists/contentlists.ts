import contentLib, {Content} from '/lib/xp/content';
const utils = require('/lib/nav-utils');
const { sortByDateTimeField } = require('/lib/headless/sort');

// Sorts and slices content lists
const getContentList = (contentListKey:string, maxItemsKey:number, sortByKey:string) => {
    const contentList = contentLib.get({ key: contentListKey });
    if (!contentList || contentList.type !== 'no.nav.navno:content-list') {
        return null;
    }
    const sectionContentsRefs = utils.forceArray(contentList?.data?.sectionContents);
    const sortFunc = sortByKey ? sortByDateTimeField(sortByKey) : undefined;
    const sectionContents = sectionContentsRefs
        .map((item: string) => contentLib.get({ key: item }))
        .filter(Boolean)
        .sort(sortFunc)
        .slice(0, maxItemsKey)
        .map((content: Content) => content._id);

    return {
        ...contentList,
        data: {
            sectionContents,
            ...(sortByKey && { sortedBy: sortByKey }),
        },
    };
};

module.exports = { getContentList };
