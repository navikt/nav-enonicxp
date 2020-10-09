const globalFragment = require('./_global');
const externalLinkFragment = require('./externalLink.es6');

const notificationsFragment = `
    ...on no_nav_navno_Notification {
        dataAsJson
        data {
            target {
                ${globalFragment}
                ${externalLinkFragment}
            }
        }
    }
`;

module.exports = { fragment: notificationsFragment };
