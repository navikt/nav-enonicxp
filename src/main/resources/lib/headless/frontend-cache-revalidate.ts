import httpClient from '/lib/http-client';
import taskLib from '/lib/xp/task';
import { getCustomPathFromContent } from '../custom-paths/custom-paths';
import { urls } from '../constants';

const numRetries = 2;
const timeoutMs = 5000;

const requestRevalidate = (paths: string[], eventId: string, retriesLeft = numRetries) => {
    try {
        const response = httpClient.request({
            url: `${urls.revalidatorProxyOrigin}/revalidator-proxy?paths=${encodeURIComponent(
                JSON.stringify(paths)
            )}&eventId=${eventId}`,
            method: 'GET',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
            },
        });

        if (response.status >= 400) {
            if (retriesLeft > 0) {
                requestRevalidate(paths, eventId, retriesLeft - 1);
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
            requestRevalidate(paths, eventId, retriesLeft - 1);
        } else {
            log.error(`Revalidate request to frontend failed for ${eventId} - ${e}`);
        }
    }
};

const requestWipeAll = (retriesLeft = numRetries) => {
    try {
        httpClient.request({
            url: `${urls.revalidatorProxyOrigin}/revalidator-proxy/wipe-all`,
            method: 'GET',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
            },
        });
        log.info('Wipe-all request to frontend acknowledged');
    } catch (e) {
        if (retriesLeft > 0) {
            requestWipeAll(retriesLeft - 1);
        } else {
            log.error(`Wipe-all request to frontend failed - ${e}`);
        }
    }
};

export const frontendCacheRevalidate = (paths: string[], eventId: string) => {
    // If the content has a custom path, the frontend will use this as key for its cache
    // Make sure we send this path to the revalidator proxy
    const pathsWithCustompaths = paths.map(
        (path) => getCustomPathFromContent(`/www.nav.no${path}`) || path
    );

    taskLib.executeFunction({
        description: `Send revalidate with event id ${eventId}`,
        func: () => {
            requestRevalidate(pathsWithCustompaths, eventId);
        },
    });
};

export const frontendCacheWipeAll = () => {
    taskLib.executeFunction({
        description: `Send wipe-all`,
        func: () => {
            requestWipeAll();
        },
    });
};
