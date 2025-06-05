import { Request, Response } from '@enonic-types/core';
import { runInContext } from 'lib/context/run-in-context';
import { ContentDescriptor } from 'types/content-types/content-config';
import { contentTypesInDataQuery } from 'lib/contenttype-lists';
import { logger } from 'lib/utils/logging';
import { validateServiceSecretHeader } from 'lib/utils/auth-utils';
import { parseJsonToArray } from 'lib/utils/array-utils';
import { PublishStatus, publishStatuses } from './utils/types';
import { runQuery } from './utils/queryRunners';

const publishStatusIsValid = (status: string): status is PublishStatus =>
    publishStatuses.includes(status as PublishStatus);

let rejectUntilTime = 0;
const timeoutPeriodMs = 1000 * 60 * 5;

export const get = (req: Request) : Response => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    // This circuit breaker is triggered if a query throws an unexpected error.
    // Prevents database errors from accumulating and crashing the server :)
    const time = Date.now();
    if (time < rejectUntilTime) {
        return {
            status: 503,
            body: {
                message: `Service unavailable for ${(rejectUntilTime - time) / 1000} seconds`,
            },
            contentType: 'application/json',
        };
    }

    const
        batch = req.params.batch as string || 0,
        types = req.params.types as string,
        publishStatus = req.params.publishStatus as string,
        requestId = req.params.requestId as string,
        query = req.params.query as string;

    if (!requestId) {
        logger.info('No request id specified');
        return {
            status: 400,
            body: {
                message: 'Missing parameter "requestId"',
            },
            contentType: 'application/json',
        };
    }

    if (!publishStatus || !publishStatusIsValid(publishStatus)) {
        logger.info(`Invalid publish status specified: ${publishStatus}`);
        return {
            status: 400,
            body: {
                message: `Invalid or missing parameter "branch" - must be one of ${publishStatuses.join(', ')}`,
            },
            contentType: 'application/json',
        };
    }

    const typesParsed = types
        ? parseJsonToArray<ContentDescriptor>(types)
        : contentTypesInDataQuery;
    if (!typesParsed) {
        return {
            status: 400,
            body: {
                message: 'Invalid type for argument "array"',
            },
            contentType: 'application/json',
        };
    }

    try {
        logger.info(`Data query: running query for request id ${requestId}, batch ${batch}`);

        const result = runInContext(
            { branch: publishStatus === 'published' ? 'master' : 'draft' },
            () =>
                runQuery({
                    requestId,
                    query,
                    publishStatus,
                    batch: Number(batch),
                    types: typesParsed,
                })
        );

        logger.info(
            `Data query: successfully ran query batch for request id ${requestId}, batch ${batch}`
        );

        return {
            status: 200,
            body: {
                requestId,
                branch: publishStatus,
                ...(query && { query }),
                ...(typesParsed.length > 0 && { types: typesParsed }),
                total: result.total,
                hits: result.hits,
                hasMore: result.hasMore,
            },
            contentType: 'application/json',
        };
    } catch (e) {
        logger.error(
            `Data query: error while running query for request id ${requestId}, batch ${batch} - ${e}`
        );

        rejectUntilTime = Date.now() + timeoutPeriodMs;

        return {
            status: 500,
            body: {
                message: `Query error for request id ${requestId} - ${e}`,
            },
            contentType: 'application/json',
        };
    }
};
