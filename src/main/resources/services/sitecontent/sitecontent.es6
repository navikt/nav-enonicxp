const cache = require('/lib/siteCache');
const { isValidBranch } = require('/lib/headless/run-in-context');
const { getSiteContent } = require('/lib/headless/guillotine/queries/sitecontent');
const { getNotifications } = require('/lib/headless/guillotine/queries/notifications');

const handleGet = (req) => {
    // id can be a content UUID, or a content path, ie. /www.nav.no/no/person
    const { id: idOrPath, branch } = req.params;
    const { secret } = req.headers;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Invalid secret',
            },
            contentType: 'application/json',
        };
    }

    if (!idOrPath) {
        return {
            status: 400,
            body: {
                message: 'No content id or path was provided',
            },
            contentType: 'application/json',
        };
    }

    if (branch && !isValidBranch(branch)) {
        return {
            status: 400,
            body: {
                message: 'Invalid branch specified',
            },
            contentType: 'application/json',
        };
    }

    const content = cache.getSitecontent(idOrPath, branch, () => getSiteContent(idOrPath, branch));

    if (!content) {
        log.info(`Content not found: ${idOrPath}`);
        return {
            status: 404,
            body: {
                message: 'Site path not found',
            },
            contentType: 'application/json',
        };
    }

    const notifications = cache.getNotifications(idOrPath, () => getNotifications(content.path));

    return {
        status: 200,
        body: { content, notifications },
        contentType: 'application/json',
    };
};

exports.get = handleGet;
