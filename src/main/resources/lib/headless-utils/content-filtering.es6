const { generateCamelCase } = require('/lib/guillotine/util/naming');

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const sortByLastModifiedDesc = (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a);

const sortAndPruneContentList = (contentList, maxItems, sortFunc) =>
    contentList?.data?.sectionContents
        ? {
              ...contentList,
              data: {
                  ...contentList.data,
                  sectionContents: contentList.data.sectionContents
                      .sort(sortFunc)
                      .slice(0, maxItems),
              },
          }
        : contentList;

const sectionPageFilter = (content) => ({
    ...content,
    data: {
        ...content.data,
        ntkContents: sortAndPruneContentList(content.data.ntkContents, content.data.nrNTK),
        newsContents: sortAndPruneContentList(
            content.data.newsContents,
            content.data.nrNews,
            sortByLastModifiedDesc
        ),
        scContents: sortAndPruneContentList(content.data.scContents, content.data.nrSC),
    },
});

// Makes sure option names for menuList follows the guillotine naming convention
const menuListItemsOptionsFilter = (content) => {
    const menuListItems = content.data.menuListItems;
    if (!menuListItems) {
        return content;
    }

    const menuListItemsFiltered = Object.keys(content.data.menuListItems).reduce(
        (acc, key) => ({ ...acc, [generateCamelCase(key)]: menuListItems[key] }),
        {}
    );

    return {
        ...content,
        data: {
            ...content.data,
            menuListItems: {
                ...menuListItemsFiltered,
                selected: generateCamelCase(menuListItems._selected),
            },
        },
    };
};

const filterContentData = (content) => {
    if (!content?.data) {
        return content;
    }

    switch (content.__typename) {
        case 'no_nav_navno_SectionPage':
            return sectionPageFilter(content);
        case 'no_nav_navno_MainArticle':
            return menuListItemsOptionsFilter(content);
        case 'no_nav_navno_FaqPage':
            return menuListItemsOptionsFilter(content);
        default:
            return content;
    }
};

module.exports = filterContentData;
