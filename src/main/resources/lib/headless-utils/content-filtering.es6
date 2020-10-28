const objectAssign = require('/lib/object-assign');

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const sortByLastModifiedDesc = (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a);

const sortAndPruneContentList = (contentList, maxItems, sortFunc) => {
    if (contentList && contentList.data) {
        const data = {
            sectionContents: list.data.sectionContents.sort(sortFunc).slice(0, maxItems),
        };
        return objectAssign(contentList, { data: objectAssign(contentList.data, data) });
    }

    return contentList;
};

const filterContent = (content) => {
    if (content.__typename === 'no_nav_navno_SectionPage' && content.data) {
        const ntkContents = sortAndPruneContentList(content.data.ntkContents, content.data.nrNTK);
        const newsContents = sortAndPruneContentList(
            content.data.newsContents,
            content.data.nrNews,
            sortByLastModifiedDesc
        );
        const scContents = sortAndPruneContentList(content.data.scContents, content.data.nrSC);

        const data = objectAssign(content.data, {
            ntkContents: ntkContents,
            newsContents: newsContents,
            scContents: scContents,
        });

        return objectAssign(content, { data: data });
    }

    return content;
};

module.exports = filterContent;
