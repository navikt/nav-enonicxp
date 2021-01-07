const deepJsonParser = require('/lib/headless/deep-json-parser');
const { guillotineQuery } = require('/lib/headless/guillotine/guillotine-query');

const notification = require('../../services/sitecontent/fragments/notification');
const globalFragment = require('../../services/sitecontent/fragments/_global');

const queryGetNotifications = `query {
    guillotine {
        query(contentTypes:"no.nav.navno:notification") {
            ${globalFragment}
            ${notification.fragment}
        }
    }
}`;

const getNotifications = (path) => {
    // Notifications should always be fetched from master, we don't want unpublished notifications
    // to be displayed in content studio
    const queryResponse = guillotineQuery(queryGetNotifications, undefined, 'master');

    const notifications = queryResponse?.query;

    if (!notifications) {
        log.info('Notifications not found');
        return null;
    }

    const parsedNotifications = deepJsonParser(notifications, ['data']);

    const localNotifications = path
        ? parsedNotifications.filter(
              (item) => item._path?.split('/').slice(0, -1).join('/') === path
          )
        : [];

    const globalNotifications = parsedNotifications.filter(
        (item) =>
            item._path.startsWith('/www.nav.no/global-notifications') &&
            !localNotifications.some((local) => local.data?.notificationToReplaceId === item._id)
    );

    return [...globalNotifications, ...localNotifications];
};

module.exports = { getNotifications };
