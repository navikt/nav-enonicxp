import httpClient from '/lib/http-client';
import taskLib from '/lib/xp/task';
import { urls } from '../constants';

const numRetries = 2;
const timeoutMs = 5000;

const requestInvalidatePaths = (paths: string[], eventId: string, retriesLeft = numRetries) => {
    try {
        const response = httpClient.request({
            url: `${urls.revalidatorProxyOrigin}/revalidator-proxy`,
            method: 'POST',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
                eventid: eventId,
            },
            body: JSON.stringify({ paths }),
        });

        if (response.status >= 400) {
            if (retriesLeft > 0) {
                requestInvalidatePaths(paths, eventId, retriesLeft - 1);
            } else {
                log.error(
                    `Revalidate request to frontend failed for ${eventId} - ${response.body}`
                );
            }
        } else {
            log.info(
                `Revalidate request to frontend acknowledged for ${eventId} - ${response.body}`
            );
        }
    } catch (e) {
        if (retriesLeft > 0) {
            requestInvalidatePaths(paths, eventId, retriesLeft - 1);
        } else {
            log.error(`Revalidate request to frontend failed for ${eventId} - ${e}`);
        }
    }
};

const requestWipeAll = (eventId: string, retriesLeft = numRetries) => {
    try {
        httpClient.request({
            url: `${urls.revalidatorProxyOrigin}/revalidator-proxy/wipe-all`,
            method: 'GET',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
                eventid: eventId,
            },
        });
        log.info('Wipe-all request to frontend acknowledged');
    } catch (e) {
        if (retriesLeft > 0) {
            requestWipeAll(eventId, retriesLeft - 1);
        } else {
            log.error(`Wipe-all request to frontend failed - ${e}`);
        }
    }
};

export const frontendCacheInvalidatePaths = (paths: string[], eventId: string) => {
    taskLib.executeFunction({
        description: `Send invalidate with event id ${eventId}`,
        func: () => {
            requestInvalidatePaths(paths, eventId);
        },
    });
};

export const frontendCacheWipeAll = (eventId: string) => {
    taskLib.executeFunction({
        description: `Send wipe-all`,
        func: () => {
            requestWipeAll(eventId);
        },
    });
};
