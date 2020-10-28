const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');

const deepSearchParseJsonAndAppend = require('/lib/headless-utils/deep-json-parser');

const notification = require('../sitecontent/fragments/notification');
const globalFragment = require('../sitecontent/fragments/_global');

const schema = guillotineLib.createSchema();

const queryGetNotifications = `query {
    guillotine {
        query(contentTypes:"no.nav.navno:notification") {
            ${globalFragment}
            ${notification.fragment}
        }
    }
}`;

const getNotifications = () => {
    const queryResponse = graphQlLib.execute(schema, queryGetNotifications);

    const { data, errors } = queryResponse;

    if (errors) {
        log.info('GraphQL errors:');
        errors.forEach((error) => log.info(error.message));
        return null;
    }

    const notifications = data.guillotine?.query;

    if (!notifications) {
        log.info('Notifications not found');
        return null;
    }

    return deepSearchParseJsonAndAppend(notifications, 'dataAsJson', 'data');
};

const handleGet = (req) => {
    const { path } = req.params;

    const notifications = getNotifications();

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
