const notificationsFragment = `
    ...on no_nav_navno_Notification {
        data {
            type
            title
            target {
                _path
                displayName
            }
        }
    }`;

module.exports = notificationsFragment;
