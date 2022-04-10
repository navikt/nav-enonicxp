import { isValidBranch } from '../../lib/utils/branch-context';
import { getResponseFromCache } from './cache';
import { generateSitecontentResponse } from './generate-response';

export const get = (req: XP.Request) => {
    // id can be a content UUID, or a content path, ie. /www.nav.no/no/person
    const { id: idOrPath, branch = 'master', time, cacheKey } = req.params;
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
            () => generateSitecontentResponse(idOrPath, branch, time),
            cacheKey
        );

        if (!content) {
            log.info(`Content not found: ${idOrPath}`);
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
        log.error(`Error fetching content for ${idOrPath} - ${e}`);
        return {
            status: 500,
            body: {
                message: 'Unknown server error',
            },
            contentType: 'application/json',
        };
    }
};
