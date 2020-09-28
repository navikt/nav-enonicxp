const notificationsFragment = `
    ...on no_nav_navno_Notification {
        data {
            type
            title
            showDescription
            showUpdated
            target {
                __typename
                _path
                displayName
                dataAsJson
            }
        }
    }`;

module.exports = notificationsFragment;
