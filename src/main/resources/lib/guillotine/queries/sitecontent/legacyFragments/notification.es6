const globalFragment = require('./_global');
const externalLink = require('./externalLink');
const { imageFragment } = require('./media');

const notificationFragment = `
    ...on no_nav_navno_Notification {
        data {
            icon {
                ${imageFragment}
            }
            title
            showDescription
            ingress
            target {
                ${globalFragment}
                ${externalLink.fragment}
            }
            type
        }
    }
`;

module.exports = { fragment: notificationFragment };
