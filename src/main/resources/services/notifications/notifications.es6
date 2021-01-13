const deepJsonParser = require('/lib/headless/deep-json-parser');
const { guillotineQuery } = require('/lib/headless/guillotine/guillotine-query');

const notification = require('../sitecontent/fragments/notification');
const globalFragment = require('../sitecontent/fragments/_global');

const queryGetNotifications = `query {
    guillotine {
        query(contentTypes:"no.nav.navno:notification") {
            ${globalFragment}
            ${notification.fragment}
        }
    }
}`;

const getNotifications = () => {
    // Notifications should always be fetched from master, we don't want unpublished notifications
    // to be displayed in content studio
    const queryResponse = guillotineQuery(queryGetNotifications, undefined, 'master');

    const notifications = queryResponse?.query;

    if (!notifications) {
        log.info('Notifications not found');
        return null;
    }

    return deepJsonParser(notifications, ['data']);
};

const handleGet = (req) => {
    const { path } = req.params;

    const notifications = getNotifications();

    if (!notifications || !Array.isArray(notifications)) {
        return {
            status: 500,
            body: {
                message: 'Invalid response',
            },
            contentType: 'application/json',
        };
    }

    const localNotifications = path
        ? notifications.filter((item) => item._path?.split('/').slice(0, -1).join('/') === path)
        : [];

    const globalNotifications = notifications.filter(
        (item) =>
            item._path.startsWith('/www.nav.no/global-notifications') &&
            !localNotifications.some(
                (local) => local.data?.notificationToReplaceId?._id === item._id
            )
    );

    return {
        status: 200,
        body: [...globalNotifications, ...localNotifications],
        contentType: 'application/json',
    };
};

exports.get = handleGet;
