const deepSearchParseJsonAndAppend = require('/lib/headless-utils/deep-json-parser');
const guillotineQuery = require('/lib/headless-utils/guillotine-query');

const notification = require('../sitecontent/fragments/notification');
const globalFragment = require('../sitecontent/fragments/_global');
const { isValidBranch } = require('/lib/headless-utils/run-in-context');

const queryGetNotifications = `query {
    guillotine {
        query(contentTypes:"no.nav.navno:notification") {
            ${globalFragment}
            ${notification.fragment}
        }
    }
}`;

const getNotifications = (branch) => {
    const queryResponse = guillotineQuery(queryGetNotifications, undefined, branch);

    const notifications = queryResponse?.query;

    if (!notifications) {
        log.info('Notifications not found');
        return null;
    }

    return deepSearchParseJsonAndAppend(notifications, 'dataAsJson', 'data');
};

const handleGet = (req) => {
    const { path, branch } = req.params;

    if (branch && !isValidBranch(branch)) {
        return {
            status: 400,
            body: {
                message: 'Invalid branch specified',
            },
            contentType: 'application/json',
        };
    }

    const notifications = getNotifications(branch);

    if (!notifications || !Array.isArray(notifications)) {
        return {
            status: 500,
            body: {
                message: 'Invalid GraphQL response',
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
            !localNotifications.some((local) => local.data?.notificationToReplaceId === item._id)
    );

    return {
        status: 200,
        body: [...globalNotifications, ...localNotifications],
        contentType: 'application/json',
    };
};

exports.get = handleGet;
