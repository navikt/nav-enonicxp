const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    httpClient: require('/lib/http-client'),
};
const frontendLiveness = require('/lib/headless-utils/frontend-liveness.es6');
const frontendOriginMap = require('/lib/headless-utils/frontend-origin.es6');

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

    const frontendPath = req.rawPath
        .replace('/www.nav.no', '')
        .split(req.branch)
        .splice(1)
        .join('/');
    const frontendUrl = `${frontendOrigin}${
        req.branch === 'draft' ? '/draft' : ''
    }${frontendPath}?${frontendLiveness.proxyFlag}=true`;
    log.info(`requesting html from frontend: ${frontendUrl}`);

    try {
        return libs.httpClient.request({
            url: frontendUrl,
            contentType: 'text/html',
        });
    } catch (e) {
        log.info(`invalid response from external frontend. error: ${e}`);
    }

    log.info(`failed to fetch html from external frontend, trying fallback...`);
    return fallbackController(req);
};

module.exports = frontendProxy;
