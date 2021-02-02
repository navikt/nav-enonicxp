const httpClient = require('/lib/http-client');
const { revalidatorProxyOrigin } = require('/lib/headless/url-origin');

const numRetries = 2;

const requestRevalidate = (path, retriesLeft = numRetries) => {
    try {
        httpClient.request({
            url: `${revalidatorProxyOrigin}/revalidator-proxy?path=${path}`,
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

const frontendCacheRevalidate = (path) => {
    if (!path) {
        return;
    }

    requestRevalidate(path);
};

module.exports = { frontendCacheRevalidate };
