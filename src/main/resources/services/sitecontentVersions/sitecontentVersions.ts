import { Request, Response } from '@enonic-types/core';
import { isUUID } from 'lib/utils/uuid';
import { isValidBranch } from 'lib/context/branches';
import { logger } from 'lib/utils/logging';
import { sitecontentVersionResolver } from 'lib/time-travel/get-content-from-datetime';
import { getServiceRequestSubPath } from 'services/service-utils';
import { userIsLoggedIn, validateServiceSecretHeader } from 'lib/utils/auth-utils';
import { SITECONTENT_404_MSG_PREFIX } from 'lib/constants';
import { publishedVersionsReqHandler } from './publishedVersions/publishedVersions';

const isValidTime = (time?: string): time is string => {
    try {
        return !!(time && !!new Date(time));
    } catch (e) {
        logger.info(`Invalid time parameter ${time} - ${e}`);
        return false;
    }
};

const sitecontentVersionsReqHandler = (req: Request) : Response => {
    const
        id = req.params.id as string,
        branch = req.params.branch ? req.params.branch as string : "master",
        time = req.params.time as string,
        locale = req.params.locale as string;

    if (!id || !isUUID(id)) {
        return {
            status: 400,
            body: {
                message: 'No valid id parameter was provided',
            },
            contentType: 'application/json',
        };
    }

    if (!isValidBranch(branch)) {
        return {
            status: 400,
            body: {
                message: 'Invalid branch specified',
            },
            contentType: 'application/json',
        };
    }

    if (!isValidTime(time)) {
        return {
            status: 400,
            body: {
                message: 'No valid time parameter was provided',
            },
            contentType: 'application/json',
        };
    }

    if (!locale) {
        return {
            status: 400,
            body: {
                message: 'No valid locale parameter was provided',
            },
            contentType: 'application/json',
        };
    }

    try {
        const content = sitecontentVersionResolver({
            liveContentId: id,
            liveLocale: locale,
            branch,
            requestedDateTime: time,
        });

        if (!content) {
            const msg = `${SITECONTENT_404_MSG_PREFIX}: ${id} - ${time}`;
            logger.info(msg);

            return {
                status: 404,
                body: {
                    message: msg,
                },
                contentType: 'application/json',
            };
        }

        return {
            status: 200,
            body: content,
            contentType: 'application/json',
        };
    } catch (e) {
        const msg = `Error fetching content version for ${id} ${time} - ${e}`;
        logger.error(msg);

        return {
            status: 500,
            body: {
                message: `Server error - ${msg}`,
            },
            contentType: 'application/json',
        };
    }
};

export const get = (req: Request) : Response => {
    if (!validateServiceSecretHeader(req) && !userIsLoggedIn()) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const subPath = getServiceRequestSubPath(req);
    if (!subPath) {
        return sitecontentVersionsReqHandler(req);
    }

    if (getServiceRequestSubPath(req) === 'publishedVersions') {
        return publishedVersionsReqHandler(req);
    }

    return {
        status: 404,
    };
};
