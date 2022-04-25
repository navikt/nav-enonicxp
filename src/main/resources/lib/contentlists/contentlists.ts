import contentLib from '/lib/xp/content';
import { forceArray, notEmpty } from '../utils/nav-utils';
import { sortByDateTimeField } from '../utils/sort';

// Sorts and slices content lists
export const getContentList = (contentListKey: string, maxItemsKey: number, sortByKey?: string) => {
    const contentList = contentLib.get({ key: contentListKey });
    if (!contentList || contentList.type !== 'no.nav.navno:content-list') {
        return null;
    }
    const sectionContentsRefs = forceArray(contentList?.data?.sectionContents);
    const sortFunc = sortByKey ? sortByDateTimeField(sortByKey) : undefined;
    const sectionContents = sectionContentsRefs
        .map((item: string) => contentLib.get({ key: item }))
        .filter(notEmpty)
        .sort(sortFunc)
        .slice(0, maxItemsKey)
        .map((content) => content._id);

    return {
        ...contentList,
        data: {
            sectionContents,
            ...(sortByKey && { sortedBy: sortByKey }),
        },
    };
};
