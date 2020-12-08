const httpClient = require('/lib/http-client');

const frontendCacheRevalidate = (path) => {
    const pathSegments = path.split('/www.nav.no');
    const relativePath = pathSegments[1] || pathSegments[0];

    if (!relativePath) {
        return;
    }

    log.info(`sending revalidate request to frontend for ${relativePath}`);

    httpClient.request({
        url: `${revalidatorProxyOrigin}/revalidator-proxy?path=${relativePath}`,
        headers: {
            secret: app.config.serviceSecret,
        },
        method: 'GET',
        contentType: 'application/json',
    });
};

module.exports = { frontendCacheRevalidate };
