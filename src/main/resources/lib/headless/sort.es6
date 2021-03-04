const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime?.split('.')[0] || content.createdTime?.split('.')[0]).getTime();

const getPublishedUnixTime = (content) =>
    new Date(
        content.publish?.from?.split('.')[0] ||
            content.publish?.first?.split('.')[0] ||
            content.createdTime?.split('.')[0]
    ).getTime();

const sortByLastModifiedDesc = (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a);

const sortByPublishedDesc = (a, b) => getPublishedUnixTime(b) - getPublishedUnixTime(a);

module.exports = { sortByLastModifiedDesc, sortByPublishedDesc };
