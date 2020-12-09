const httpClient = require('/lib/http-client');
const { revalidatorProxyOrigin } = require('/lib/headless/url-origin');

const frontendCacheRevalidate = (path) => {
    const pathSegments = path.split('/www.nav.no');
    const relativePath = pathSegments[1] || pathSegments[0];

    if (!relativePath) {
        return;
    }

    try {
        httpClient.request({
            url: `${revalidatorProxyOrigin}/revalidator-proxy?path=${relativePath}`,
            method: 'GET',
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
            },
        });

        log.info(`Sent revalidate request to frontend for ${relativePath}`);
    } catch (e) {
        log.error(`Revalidate request to frontend failed for ${relativePath} - ${e}`);
    }
};

module.exports = { frontendCacheRevalidate };
