const objectAssign = require('/lib/object-assign');

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const sortByLastModified = (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a);

const sortAndPruneContentList = (maxItems, contentList, sortFunc = sortByLastModified) => {
    const data = {
        sectionContents: contentList.data.sectionContents.sort(sortFunc).slice(0, maxItems),
    };

    return objectAssign(contentList, { data: objectAssign(contentList.data, data) });
};

const filterContent = (content) => {
    if (content.__typename === 'no_nav_navno_SectionPage') {
        const ntkContents = sortAndPruneContentList(content.data.nrNTK, content.data.ntkContents);
        const newsContents = sortAndPruneContentList(
            content.data.nrNews,
            content.data.newsContents
        );
        const scContents = sortAndPruneContentList(content.data.nrSC, content.data.scContents);

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
