const httpClient = require('/lib/http-client');
const { frontendOrigin } = require('/lib/headless/url-origin');

const loopbackCheckParam = 'fromXp';

const errorResponse = (url, status, message) => {
    const msg = `Failed to fetch from frontend: ${url} - ${status}: ${message}`;
    log.error(msg);

    return {
        contentType: 'text/html',
        body: `<div>${msg}</div>`,
        status,
    };
};

// This proxies requests made directly to XP to the frontend. Normally this will
// only be used in the portal-admin content studio previews
const adminFrontendProxy = (req) => {
    const isLoopback = req.params[loopbackCheckParam];
    if (isLoopback) {
        log.info(`Loopback to XP detected from path ${req.rawPath}`);
        return {
            contentType: 'text/html',
            body: `<div>Error: request to frontend looped back to XP</div>`,
            status: 200,
        };
    }

    const pathStartIndex = req.rawPath.indexOf(req.branch) + req.branch.length;
    const contentPath = req.rawPath.slice(pathStartIndex).replace('/www.nav.no', '');

    const frontendPath = req.branch === 'draft' ? `/draft${contentPath}` : contentPath;
    const frontendUrl = `${frontendOrigin}${frontendPath}?${loopbackCheckParam}=true`;

    try {
        const response = httpClient.request({
            url: frontendUrl,
            contentType: 'text/html',
            connectionTimeout: 5000,
            headers: {
                secret: app.config.serviceSecret,
            },
            followRedirects: false,
        });

        if (!response) {
            return errorResponse(frontendUrl, 500, 'No response from HTTP client');
        }

        if (response.status >= 400) {
            log.info(
                `Error response from frontend for ${frontendUrl}: ${response.status} - ${response.message}`
            );
        }

        return response;
    } catch (e) {
        return errorResponse(frontendUrl, 500, `Exception: ${e}`);
    }
};

exports.get = adminFrontendProxy;
exports.handleError = adminFrontendProxy;
