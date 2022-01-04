import { tstest } from '/lib/tstest';
const { isValidBranch } = require('/lib/headless/branch-context');
const { getSiteContent } = require('/lib/headless/guillotine/queries/sitecontent');

const handleGet = (req) => {
    // id can be a content UUID, or a content path, ie. /www.nav.no/no/person
    const { id: idOrPath, branch, time, nocache } = req.params;
    const { secret } = req.headers;

    tstest();

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
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

    const content = getSiteContent(idOrPath, branch, time, nocache);

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

    return {
        status: 200,
        body: content,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
