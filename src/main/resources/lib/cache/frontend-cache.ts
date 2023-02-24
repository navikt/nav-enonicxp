import httpClient, { HttpResponse } from '/lib/http-client';
import * as taskLib from '/lib/xp/task';
import * as schedulerLib from '/lib/xp/scheduler';
import { APP_DESCRIPTOR, URLS } from '../constants';
import { getFrontendPathname } from './utils';
import { logger } from '../utils/logging';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { CacheInvalidateAllConfig } from '../../tasks/cache-invalidate-all/cache-invalidate-all-config';

const NUM_RETRIES = 3;
const TIMEOUT_MS = 10000;

const REVALIDATOR_PROXY_URL = `${URLS.REVALIDATOR_PROXY_ORIGIN}/revalidator-proxy`;
const REVALIDATOR_PROXY_URL_WIPE_ALL = `${URLS.REVALIDATOR_PROXY_ORIGIN}/revalidator-proxy/wipe-all`;

const DEFERRED_JOB_NAME = 'invalidate-all-job';
const DEFERRED_TIME_MS_DEFAULT = 60000;

export const frontendInvalidateAllDeferred = (
    eventId: string,
    deferredTime = DEFERRED_TIME_MS_DEFAULT,
    rescheduleIfExists = false
) => {
    const existingJob = schedulerLib.get({ name: DEFERRED_JOB_NAME });

    const now = new Date();
    const targetScheduleTime = new Date(now.getTime() + deferredTime);

    if (existingJob && !rescheduleIfExists) {
        const currentScheduleTime = new Date(existingJob.schedule.value);
        if (currentScheduleTime > now && currentScheduleTime < targetScheduleTime) {
            logger.info('Invalidation job is already scheduled within the target timeframe');
            return;
        }
    }

    createOrUpdateSchedule<CacheInvalidateAllConfig>({
        jobName: DEFERRED_JOB_NAME,
        jobSchedule: {
            type: 'ONE_TIME',
            value: targetScheduleTime.toISOString(),
        },
        taskDescriptor: `${APP_DESCRIPTOR}:cache-invalidate-all`,
        taskConfig: {
            retryIfFail: true,
            eventId,
        },
        masterOnly: false,
    });

    logger.info(`Scheduled cache invalidation job at ${targetScheduleTime}`);
};

const frontendInvalidatePathsRequest = (
    paths: string[],
    eventId: string,
    retriesLeft = NUM_RETRIES
): HttpResponse | null => {
    try {
        const response = httpClient.request({
            url: REVALIDATOR_PROXY_URL,
            method: 'POST',
            connectionTimeout: TIMEOUT_MS,
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
    paths,
    eventId,
}: {
    paths: string[];
    eventId: string;
}) => {
    if (paths.length === 0) {
        logger.info(`Nothing to invalidate for event ${eventId} - aborting frontend request`);
        return;
    }

    taskLib.executeFunction({
        description: `Send invalidate with event id ${eventId}`,
        func: () => {
            // Ensure the paths we send to the frontend for invalidation are of the same format as used
            // by the frontend
            const frontendPaths = paths.map(getFrontendPathname);

            frontendInvalidatePathsRequest(frontendPaths, eventId);
        },
    });
};

export const frontendInvalidateAllSync = (
    eventId: string,
    rescheduleOnFailure = false,
    retriesLeft = NUM_RETRIES
): HttpResponse | null => {
    try {
        const response = httpClient.request({
            url: REVALIDATOR_PROXY_URL_WIPE_ALL,
            method: 'GET',
            connectionTimeout: TIMEOUT_MS,
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
