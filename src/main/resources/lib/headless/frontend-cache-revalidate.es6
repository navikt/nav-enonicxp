const httpClient = require('/lib/http-client');
const { frontendOrigin } = require('/lib/headless/url-origin');

const frontendCacheRevalidate = (path) => {
    const pathSegments = path.split('/www.nav.no');
    const relativePath = pathSegments[1] || pathSegments[0];
    log.info(`sending revalidate event to frontend for ${relativePath}`);

    httpClient.request({
        url: `${frontendOrigin}/api/cache-revalidator?path=${relativePath}`,
        method: 'GET',
        contentType: 'application/json',
    });
};

module.exports = { frontendCacheRevalidate };
