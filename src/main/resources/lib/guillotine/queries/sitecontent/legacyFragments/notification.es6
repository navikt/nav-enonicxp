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
            notificationToReplaceId {
                _id
                _path
            }
            type
        }
    }
`;

module.exports = { fragment: notificationFragment };
