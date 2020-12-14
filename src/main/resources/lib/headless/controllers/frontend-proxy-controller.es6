const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    httpClient: require('/lib/http-client'),
};
const frontendLiveness = require('/lib/headless/frontend-liveness');
const { setFrontendNotLive } = require('/lib/headless/frontend-liveness');
const { frontendOrigin } = require('/lib/headless/url-origin');

const frontendProxy = (req, fallbackController) => {
    const frontendPath =
        (req.branch === 'draft' ? '/draft' : '') +
        // Request-paths from content studio in edit-mode comes in the form of the UUID of the content-object.
        // Need to prepend /www.nav.no to get a valid url for legacy-frontend
        (req.mode === 'edit' ? '/www.nav.no' : '') +
        req.rawPath.replace('/www.nav.no', '').split(req.branch).splice(1).join('/');

    const frontendUrl = `${frontendOrigin}${frontendPath}?${frontendLiveness.loopbackFlag}=true`;
    try {
        const response = libs.httpClient.request({
            url: frontendUrl,
            contentType: 'text/html',
            connectionTimeout: 1000,
            headers: {
                secret: app.config.serviceSecret,
            },
        });

        if (response?.ok) {
            return response;
        }
    } catch (e) {
        log.info(`Frontend HTTP request error - ${e}`);
    }

    setFrontendNotLive();
    log.info(`Failed to fetch html from external frontend, trying fallback`);

    return fallbackController(req);
};

module.exports = frontendProxy;
