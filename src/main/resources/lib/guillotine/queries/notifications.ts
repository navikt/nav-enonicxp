import { guillotineQuery } from '../guillotine-query';
import { Content } from '/lib/xp/content';

const notification = require('/lib/guillotine/queries/sitecontent/legacyFragments/notification');
const globalFragment = require('/lib/guillotine/queries/sitecontent/legacyFragments/_global');

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
    const notifications = guillotineQuery({
        query: queryGetNotifications,
        branch: 'master',
        jsonBaseKeys: ['data'],
    })?.query as Content<'no.nav.navno:notification'>[] | null;

    if (!notifications) {
        return null;
    }

    const localNotifications = path
        ? notifications.filter((item) => item._path?.split('/').slice(0, -1).join('/') === path)
        : [];

    const globalNotifications = notifications.filter(
        (item) =>
            item._path.startsWith('/www.nav.no/global-notifications') &&
            !localNotifications.some((local) => local.data?.notificationToReplaceId === item._id)
    );

    return [...globalNotifications, ...localNotifications];
};
