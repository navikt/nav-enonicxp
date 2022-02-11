const httpClient = require('/lib/http-client');
const clusterLib = require('/lib/xp/cluster');
const taskLib = require('/lib/xp/task');
const { getCustomPathFromContent } = require('/lib/custom-paths/custom-paths');
const { urls } = require('/lib/constants');

const numRetries = 2;
const timeoutMs = 5000;

const requestRevalidate = (path, retriesLeft = numRetries) => {
    try {
        httpClient.request({
            url: `${urls.revalidatorProxyOrigin}/revalidator-proxy?path=${encodeURI(path)}`,
            method: 'GET',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
            },
        });
        log.info(`Revalidate request to frontend acknowledged for ${path}`);
    } catch (e) {
        if (retriesLeft > 0) {
            requestRevalidate(path, retriesLeft - 1);
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

const frontendCacheRevalidate = (pathname) => {
    if (!pathname) {
        return;
    }

    if (clusterLib.isMaster()) {
        taskLib.submit({
            description: `Send revalidate on ${pathname}`,
            task: () => {
                // If the content has a custom path, the frontend will use this as key for its cache
                // Make sure we send this path to the revalidator proxy
                const customPath = getCustomPathFromContent(`/www.nav.no${pathname}`);

                requestRevalidate(customPath || pathname);
            },
        });
    }
};

const frontendCacheWipeAll = () => {
    if (clusterLib.isMaster()) {
        taskLib.submit({
            description: `Send wipe-all`,
            task: () => {
                requestWipeAll();
            },
        });
    }
};

module.exports = { frontendCacheRevalidate, frontendCacheWipeAll };
