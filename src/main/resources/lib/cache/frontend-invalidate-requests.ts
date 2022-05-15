import httpClient, { HttpResponse } from '/lib/http-client';
import taskLib from '/lib/xp/task';
import { Content } from '/lib/xp/content';
import { appDescriptor, urls } from '../constants';
import { getFrontendPathname, isRenderedType } from './utils';
import { getCustomPathFromContent } from '../custom-paths/custom-paths';
import { logger } from '../utils/logging';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { CacheInvalidateAllConfig } from '../../tasks/cache-invalidate-all/cache-invalidate-all-config';

const numRetries = 3;
const timeoutMs = 10000;

const revalidatorProxyUrl = `${urls.revalidatorProxyOrigin}/revalidator-proxy`;
const revalidatorProxyUrlWipeAll = `${urls.revalidatorProxyOrigin}/revalidator-proxy/wipe-all`;

export const frontendInvalidateAllDeferred = (eventId: string) => {
    const nowPlusOneMinute = new Date(Date.now() + 60000).toISOString();

    createOrUpdateSchedule<CacheInvalidateAllConfig>({
        jobName: 'invalidate-all-job',
        jobSchedule: {
            type: 'ONE_TIME',
            value: nowPlusOneMinute,
        },
        taskDescriptor: `${appDescriptor}:cache-invalidate-all`,
        taskConfig: {
            retryIfFail: true,
            eventId,
        },
    });

    logger.info(`Scheduled cache invalidation job at ${nowPlusOneMinute}`);
};

const frontendInvalidatePathsRequest = (
    paths: string[],
    eventId: string,
    retriesLeft = numRetries
): HttpResponse | null => {
    try {
        const response = httpClient.request({
            url: revalidatorProxyUrl,
            method: 'POST',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
                eventid: eventId,
            },
            body: JSON.stringify({ paths }),
        });

        if (response.status < 400) {
            logger.info(`Revalidate request to frontend acknowledged for ${eventId}`);
            return response;
        }

        if (retriesLeft > 0) {
            return frontendInvalidatePathsRequest(paths, eventId, retriesLeft - 1);
        }

        logger.critical(`Revalidate request to frontend failed for ${eventId} - ${response.body}`);
    } catch (e) {
        if (retriesLeft > 0) {
            return frontendInvalidatePathsRequest(paths, eventId, retriesLeft - 1);
        }

        logger.critical(`Revalidate request to frontend failed for ${eventId} - ${e}`);
    }

    // If the invalidation call failed, it is likely due to network issues between XP servers and
    // the revalidator proxy + frontend. Reschedule a full cache-invalidation to be on the safe side.
    frontendInvalidateAllDeferred(eventId);

    return null;
};

export const frontendInvalidatePaths = ({
    contents = [],
    paths = [],
    eventId,
}: {
    contents?: Content[];
    paths?: string[];
    eventId: string;
}) => {
    taskLib.executeFunction({
        description: `Send invalidate with event id ${eventId}`,
        func: () => {
            // Ensure the paths we send to the frontend for invalidation are of the same format as used
            // by the frontend. Also filter out any content types that aren't rendered/cached by the frontend.
            const frontendPaths = [
                ...contents
                    .filter((content) => isRenderedType(content))
                    .map(
                        (content) =>
                            getCustomPathFromContent(content._path) ||
                            getFrontendPathname(content._path)
                    ),
                ...paths.map(getFrontendPathname),
            ];

            if (frontendPaths.length === 0) {
                logger.info(
                    `Nothing to invalidate for event ${eventId} - aborting frontend request`
                );
                return;
            }

            frontendInvalidatePathsRequest(frontendPaths, eventId);
        },
    });
};

export const frontendInvalidateAllSync = (
    eventId: string,
    rescheduleOnFailure = false,
    retriesLeft = numRetries
): HttpResponse | null => {
    try {
        const response = httpClient.request({
            url: revalidatorProxyUrlWipeAll,
            method: 'GET',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
                eventid: eventId,
            },
        });

        if (response.status === 200) {
            logger.info(
                `Wipe-all request to frontend acknowledged for event ${eventId} - ${response.message}`
            );
            return response;
        }

        if (retriesLeft > 0) {
            return frontendInvalidateAllSync(eventId, rescheduleOnFailure, retriesLeft - 1);
        }

        logger.critical(
            `Wipe-all request to frontend failed for ${eventId} - ${response.status} - ${response.message}`
        );
    } catch (e) {
        if (retriesLeft > 0) {
            return frontendInvalidateAllSync(eventId, rescheduleOnFailure, retriesLeft - 1);
        }

        logger.critical(`Wipe-all request to frontend failed for ${eventId} - Error: ${e}`);
    }

    if (rescheduleOnFailure) {
        frontendInvalidateAllDeferred(eventId);
    }

    return null;
};

export const frontendInvalidateAllAsync = (eventId: string, rescheduleOnFailure = false) => {
    taskLib.executeFunction({
        description: `Send wipe-all`,
        func: () => {
            frontendInvalidateAllSync(eventId, rescheduleOnFailure);
        },
    });
};
