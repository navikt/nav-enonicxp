/* eslint-disable */

const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    httpClient: require('/lib/http-client'),
};
const view = resolve('/site/pages/main-page/main-page.html');

function getLegacyHtml() {
    const content = libs.portal.getContent();
    const regions = content.page.regions;
    const model = {
        mainRegion: regions.main,
        language: content.language || 'no',
    };
    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model),
    };
}

const getHostname = (url) => {
    if (url.indexOf('localhost') > -1) {
        return 'http://localhost:8090/person/navno-frontend';
    }
    return 'https://www-q6.nav.no/person/navno-frontend';
};

function handleGet(req) {
    Object.keys(req).forEach((k) => log.info(`key: ${k} - value: ${JSON.stringify(req[k])}`));
    if (req.params.legacy) {
        return getLegacyHtml(req);
    }

    const path = req.rawPath.split(req.branch).splice(1);
    const previewUrl = `${getHostname(req.url)}/api/preview?secret=asdf&branch=${
        req.branch
    }&slug=${path}`;

    return libs.httpClient.request({
        url: previewUrl,
        method: 'GET',
        followRedirects: false,
        contentType: 'text/html',
    });
}

exports.get = handleGet;
