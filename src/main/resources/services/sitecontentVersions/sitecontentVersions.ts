import { isUUID } from '../../lib/utils/uuid';
import { isValidBranch } from '../../lib/utils/branch-context';
import { logger } from '../../lib/utils/logging';
import { getContentVersionFromDateTime } from '../../lib/time-travel/get-content-from-datetime';
import { getSubPath } from '../service-utils';
import { userIsAuthenticated, validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { publishedVersionsReqHandler } from './publishedVersions/publisedVersions';

const isValidTime = (time?: string): time is string => {
    try {
        return !!(time && !!new Date(time));
    } catch (e) {
        logger.info(`Invalid time parameter ${time} - ${e}`);
        return false;
    }
};

const sitecontentVersionsReqHandler = (req: XP.Request) => {
    const { id, branch = 'master', time } = req.params;

    if (!isUUID(id)) {
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

    try {
        const content = getContentVersionFromDateTime(id, branch, time);

        if (!content) {
            const msg = `Content version not found: ${id} - ${time}`;
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

export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req) && !userIsAuthenticated()) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const subPath = getSubPath(req);

    if (!subPath) {
        return sitecontentVersionsReqHandler(req);
    }

    if (getSubPath(req) === 'publishedVersions') {
        return publishedVersionsReqHandler(req);
    }

    return {
        status: 404,
    };
};