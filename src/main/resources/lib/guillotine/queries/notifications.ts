import { guillotineQuery } from '../guillotine-query';

const notification = require('/lib/guillotine/queries/sitecontent/fragments/notification');
const globalFragment = require('/lib/guillotine/queries/sitecontent/fragments/_global');

const queryGetNotifications = `query {
    guillotine {
        query(contentTypes:"no.nav.navno:notification", sort:"_manualordervalue DESC") {
            ${globalFragment}
            ${notification.fragment}
        }
    }
}`;

export const getNotifications = (path: string) => {
    // Notifications should always be fetched from master, we don't want unpublished notifications
    // to be displayed in content studio
    const queryResponse = guillotineQuery({
        query: queryGetNotifications,
        branch: 'master',
        jsonBaseKeys: ['data'],
    });

    const notifications = queryResponse?.query;

    if (!notifications) {
        log.info('Notifications not found');
        return null;
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

    return [...globalNotifications, ...localNotifications];
};
