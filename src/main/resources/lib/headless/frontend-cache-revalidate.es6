const httpClient = require('/lib/http-client');
const { frontendOrigin } = require('/lib/headless/url-origin');

const frontendCacheRevalidate = (path) => {
    const pathSegments = path.split('/www.nav.no');
    const relativePath = pathSegments[1] || pathSegments[0];

    if (!relativePath) {
        return;
    }

    log.info(`sending revalidate request to frontend for ${relativePath}`);

    httpClient.request({
        url: `${frontendOrigin}/api/cache-revalidator?path=${relativePath}`,
        headers: {
            secret: app.config.serviceSecret,
        },
        method: 'GET',
        contentType: 'application/json',
    });
};

module.exports = { frontendCacheRevalidate };
