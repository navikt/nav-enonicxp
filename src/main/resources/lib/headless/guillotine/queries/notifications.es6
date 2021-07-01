const deepJsonParser = require('/lib/headless/deep-json-parser');
const { guillotineQuery } = require('/lib/headless/guillotine/guillotine-query');
const cache = require('/lib/siteCache');

const notification = require('/lib/headless/guillotine/queries/fragments/notification');
const globalFragment = require('/lib/headless/guillotine/queries/fragments/_global');

const queryGetNotifications = `query {
    guillotine {
        query(contentTypes:"no.nav.navno:notification", sort:"_manualordervalue DESC") {
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
            !localNotifications.some(
                (local) => local.data?.notificationToReplaceId?._id === item._id
            )
    );

    return [...globalNotifications, ...localNotifications];
};

const getFromCache = (path) => cache.getNotifications(path, () => getNotifications(path));

module.exports = { getNotifications: getFromCache, getNotificationsNoCache: getNotifications };
