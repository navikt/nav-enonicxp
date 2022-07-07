import { isValidBranch } from '../../lib/utils/branch-context';
import { getResponseFromCache } from './cache';
import { getSitecontentResponse } from './generate-response';
import { logger } from '../../lib/utils/logging';

export const get = (req: XP.Request) => {
    // id can be a content UUID, or a content path, ie. /www.nav.no/no/person
    const { id: idOrPath, branch = 'master', preview, time, cacheKey } = req.params;
    const { secret } = req.headers;

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

    if (!isValidBranch(branch)) {
        return {
            status: 400,
            body: {
                message: 'Invalid branch specified',
            },
            contentType: 'application/json',
        };
    }

    try {
        const content = getResponseFromCache(
            idOrPath,
            () => getSitecontentResponse(idOrPath, branch, preview === 'true', time),
            cacheKey
        );

        if (!content) {
            logger.info(`Content not found: ${idOrPath}`);
            return {
                status: 404,
                body: {
                    // This message is used by the frontend to differentiate between
                    // 404 returned from this service and general 404 from the server
                    // Don't change it without also changing the implementation in the frontend!
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
    } catch (e) {
        const msg = `Error fetching content for ${idOrPath} - ${e}`;

        if (branch === 'master') {
            logger.critical(msg);
        } else {
            logger.error(msg);
        }

        return {
            status: 500,
            body: {
                message: `Server error - ${msg}`,
            },
            contentType: 'application/json',
        };
    }
};
