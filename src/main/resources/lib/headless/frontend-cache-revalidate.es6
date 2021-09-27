const httpClient = require('/lib/http-client');
const clusterLib = require('/lib/xp/cluster');
const taskLib = require('/lib/xp/task');
const { getCustomPathFromContent } = require('/lib/custom-paths/custom-paths');
const { revalidatorProxyOrigin } = require('/lib/headless/url-origin');

const numRetries = 2;

const requestRevalidate = (path, retriesLeft = numRetries) => {
    try {
        httpClient.request({
            url: `${revalidatorProxyOrigin}/revalidator-proxy?path=${encodeURI(path)}`,
            method: 'GET',
            connectionTimeout: 1000,
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

const frontendCacheRevalidate = (pathname) => {
    if (!pathname) {
        return;
    }

    if (clusterLib.isMaster()) {
        taskLib.submit({
            description: `send revalidate on ${pathname}`,
            task: () => {
                // If the content has a custom path, the frontend will use this as key for its cache
                // Make sure we send this path to the revalidator proxy
                const customPath = getCustomPathFromContent(`/www.nav.no${pathname}`);

                requestRevalidate(customPath || pathname);
            },
        });
    }
};

module.exports = { frontendCacheRevalidate };
