const httpClient = require('/lib/http-client');
const { frontendOrigin } = require('/lib/headless/url-origin');

const errorResponse = (url, status, message) => {
    const msg = `Failed to fetch from frontend: ${url} - ${status}: ${message}`;
    log.error(msg);

    return {
        contentType: 'text/html',
        body: `<div>${msg}</div>`,
        status,
    };
};

const adminFrontendProxy = (req) => {
    const pathStartIndex = req.rawPath.indexOf(req.branch) + req.branch.length;
    const contentPath = req.rawPath.replace('/www.nav.no', '').slice(pathStartIndex);

    const frontendPath = req.branch === 'draft' ? `${contentPath}/draft` : contentPath;
    const frontendUrl = `${frontendOrigin}${frontendPath}`;

    try {
        const response = httpClient.request({
            url: frontendUrl,
            contentType: 'text/html',
            connectionTimeout: 5000,
            headers: {
                secret: app.config.serviceSecret,
            },
        });

        if (!response) {
            return errorResponse(frontendUrl, 500, 'No response from HTTP client');
        }

        if (response.status !== 200) {
            log.info(
                `Unexpected response from frontend for ${frontendUrl}: ${response.status} - ${response.message}`
            );
        }

        return response;
    } catch (e) {
        return errorResponse(frontendUrl, 500, `Exception caught: ${e}`);
    }
};

exports.get = adminFrontendProxy;
exports.handleError = adminFrontendProxy;
