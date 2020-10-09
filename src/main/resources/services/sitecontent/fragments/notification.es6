const globalFragment = require('./_global');
const externalLink = require('./externalLink.es6');

const notificationsFragment = `
    ...on no_nav_navno_Notification {
        dataAsJson
        data {
            target {
                ${globalFragment}
                ${externalLink.fragment}
            }
        }
    }
`;

module.exports = { fragment: notificationsFragment };
