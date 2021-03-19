const { getNestedValue } = require('/lib/nav-utils');

const getTimeFromField = (content, field) =>
    new Date(
        getNestedValue(content, field)?.split('.')[0] || content.createdTime?.split('.')[0]
    ).getTime();

const sortByDateTimeField = (dateField) => (a, b) =>
    getTimeFromField(b, dateField) - getTimeFromField(a, dateField);

module.exports = { sortByDateTimeField };
