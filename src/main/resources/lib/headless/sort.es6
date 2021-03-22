const { getNestedValue } = require('/lib/nav-utils');

const getTimeFromField = (content, key) =>
    new Date(
        getNestedValue(content, key)?.split('.')[0] || content.createdTime?.split('.')[0]
    ).getTime();

const sortByDateTimeField = (key) => (a, b) => getTimeFromField(b, key) - getTimeFromField(a, key);

module.exports = { sortByDateTimeField };
