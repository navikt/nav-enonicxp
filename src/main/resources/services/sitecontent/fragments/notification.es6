const notificationsFragment = `
    ...on no_nav_navno_Notification {
        data {
            type
            title
            showDescription
            showUpdated
            target {
                _path
                displayName
            }
        }
    }`;

module.exports = notificationsFragment;
