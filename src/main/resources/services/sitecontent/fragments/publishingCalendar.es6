const globalFragment = require('./_global');

const publishingCalenderEntryFragment = `
    ...on no_nav_navno_PublishingCalendarEntry {
        dataAsJson
    }
`;

const publishingCalenderFragment = `
    ...on no_nav_navno_PublishingCalendar {
        dataAsJson
        children(first:1000) {
           ${globalFragment}
           ${publishingCalenderEntryFragment}
        }
    }
`;

module.exports = { fragment: publishingCalenderFragment };
