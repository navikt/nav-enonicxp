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
        log.info(`Sent revalidate request to frontend for ${path}`);
    } catch (e) {
        if (retriesLeft > 0) {
            requestRevalidate(path, retriesLeft - 1);
        } else {
            log.error(`Revalidate request to frontend failed for ${path} - ${e}`);
        }
    }
};

const frontendCacheRevalidate = (path) => {
    const pathSegments = path.split('/www.nav.no');
    const relativePath = pathSegments[1] || pathSegments[0];

    if (!relativePath) {
        return;
    }

    requestRevalidate(relativePath);
};

module.exports = { frontendCacheRevalidate };
