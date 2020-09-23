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
        return 'http://localhost:3000/person/xp-frontend';
    }
    return 'https://www-q6.nav.no/person/xp-frontend';
};

function handleGet(req) {
    Object.keys(req).forEach((k) => log.info(`key: ${k} - value: ${req[k]}`));
    if (req.params.legacy) {
        return getLegacyHtml(req);
    }

    if (req.method !== 'GET') {
        return {
            status: 200,
        };
    }

    const path = req.rawPath.split(req.branch).splice(1);
    const previewUrl = `${getHostname(req.url)}/api/preview?secret=asdf&branch=${
        req.branch
    }&slug=${path}`;
    log.info(`path: ${path}`);
    log.info(`url: ${previewUrl}`);

    const response = libs.httpClient.request({
        url: previewUrl,
        contentType: 'text/html',
    });

    if (response.body) {
        const { url } = JSON.parse(response.body);
        return {
            status: 307,
            headers: {
                Location: url,
            },
        };
    }

    return {
        status: 404,
        body: {
            message: 'Content not found',
        },
        contentType: 'application/json',
    };

    // return libs.httpClient.request({
    //     url: previewUrl,
    //     method: 'GET',
    //     followRedirects: false,
    //     contentType: 'text/html',
    // });
}

exports.get = handleGet;
