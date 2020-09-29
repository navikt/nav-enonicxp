const globalFragment = require('./_global');

const notificationsFragment = `
    ...on no_nav_navno_Notification {
        data {
            target {
                ${globalFragment}
            }
        }
    }
`;

module.exports = notificationsFragment;
