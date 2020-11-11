const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    httpClient: require('/lib/http-client'),
};
const frontendLiveness = require('/lib/headless-utils/frontend-liveness');
const frontendOriginMap = require('/lib/headless-utils/frontend-origin');

const frontendOrigin = frontendOriginMap[app.config.env] || frontendOriginMap.p;
const legacyPath = '/_/legacy';
const legacyView = resolve('/site/pages/main-page/main-page-legacy-stripped.html');

const legacyHtml = () => {
    const content = libs.portal.getContent();
    const regions = content.page.regions;
    const model = {
        mainRegion: regions.main,
        language: content.language || 'no',
    };
    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(legacyView, model),
    };
};

const frontendProxy = (req, fallbackController) => {
    if (req.path.startsWith(legacyPath)) {
        return legacyHtml();
    }

    const frontendPath =
        (req.branch === 'draft' ? '/draft' : '') +
        // Request-paths from content studio in edit-mode comes in the form of the UUID of the content-object.
        // Need to prepend /www.nav.no to get a valid url for legacy-frontend
        (req.mode === 'edit' ? '/www.nav.no' : '') +
        req.rawPath.replace('/www.nav.no', '').split(req.branch).splice(1).join('/');

    const frontendUrl = `${frontendOrigin}${frontendPath}?${frontendLiveness.proxyFlag}=true`;
    log.info(`requesting html from frontend: ${frontendUrl}`);

    try {
        return libs.httpClient.request({
            url: frontendUrl,
            contentType: 'text/html',
            connectionTimeout: 1000,
        });
    } catch (e) {
        log.info(`invalid response from external frontend. error: ${e}`);
    }

    log.info(`failed to fetch html from external frontend, trying fallback...`);
    return fallbackController(req);
};

module.exports = frontendProxy;
