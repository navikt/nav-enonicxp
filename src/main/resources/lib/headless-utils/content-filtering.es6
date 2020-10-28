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

const filterContent = (content) => {
    if (content?.__typename === 'no_nav_navno_SectionPage' && content.data) {
        const ntkContents = sortAndPruneContentList(content.data.ntkContents, content.data.nrNTK);
        const newsContents = sortAndPruneContentList(
            content.data.newsContents,
            content.data.nrNews,
            sortByLastModifiedDesc
        );
        const scContents = sortAndPruneContentList(content.data.scContents, content.data.nrSC);

        return {
            ...content,
            data: {
                ...content.data,
                ntkContents: ntkContents,
                newsContents: newsContents,
                scContents: scContents,
            },
        };
    }

    return content;
};

module.exports = filterContent;
