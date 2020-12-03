const globalFragment = require('./_global');

const publishingCalenderEntryFragment = `
    ...on no_nav_navno_PublishingCalendarEntry {
        dataAsJson
    }
`;

const publishingCalenderFragment = `
    ...on no_nav_navno_PublishingCalendar {
        dataAsJson
        children {
           ${globalFragment}
           ${publishingCalenderEntryFragment}
        }
    }
`;

module.exports = { fragment: publishingCalenderFragment };
