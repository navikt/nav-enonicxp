import httpClient from '/lib/http-client';
import taskLib from '/lib/xp/task';
import { getCustomPathFromContent } from '../custom-paths/custom-paths';
import { urls } from '../constants';

const numRetries = 2;
const timeoutMs = 5000;

const requestRevalidate = (path: string, eventId: string, retriesLeft = numRetries) => {
    try {
        const response = httpClient.request({
            url: `${urls.revalidatorProxyOrigin}/revalidator-proxy?path=${encodeURI(
                path
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
                requestRevalidate(path, eventId, retriesLeft - 1);
            } else {
                log.error(`Revalidate request to frontend failed for ${path} - ${response.body}`);
            }
        } else {
            log.info(`Revalidate request to frontend acknowledged for ${path} - ${response.body}`);
        }
    } catch (e) {
        if (retriesLeft > 0) {
            requestRevalidate(path, eventId, retriesLeft - 1);
        } else {
            log.error(`Revalidate request to frontend failed for ${path} - ${e}`);
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

export const frontendCacheRevalidate = (pathname: string, eventId: string) => {
    if (!pathname) {
        return;
    }

    taskLib.executeFunction({
        description: `Send revalidate on ${pathname}`,
        func: () => {
            // If the content has a custom path, the frontend will use this as key for its cache
            // Make sure we send this path to the revalidator proxy
            const customPath = getCustomPathFromContent(`/www.nav.no${pathname}`);

            requestRevalidate(customPath || pathname, eventId);
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
