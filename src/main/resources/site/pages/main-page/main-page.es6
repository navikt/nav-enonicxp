const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    httpClient: require('/lib/http-client'),
};

const previewSecret = 'asdf';
const legacySource = '/_/service/legacy';
const view = resolve('/site/pages/main-page/main-page.html');

// TODO: denne funksjonaliteten finnes kanskje allerede? :)
const previewApiUrlMap = {
    localhost: 'http://localhost:3000/api/preview',
    q6: 'https://www-q6.nav.no/api/preview',
    q1: 'https://www-q1.nav.no/api/preview',
    p: 'https://www.nav.no/api/preview',
};

const previewApiUrl = previewApiUrlMap[app.config.env] || previewApiUrlMap.p;

const generateLegacyHtml = () => {
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
};

const handleGet = (req) => {
    Object.keys(req).forEach((k) => log.info(`key main-controller: ${k} - value: ${req[k]}`));
    if (req.path.startsWith(legacySource)) {
        return generateLegacyHtml();
    }

    if (req.method !== 'GET') {
        return {
            status: 200,
        };
    }

    if (req.params.didRedirect) {
        return {
            status: 200,
        };
    }

    const path = req.rawPath.split(req.branch).splice(1);
    const previewUrl = `${previewApiUrl}?secret=${previewSecret}&branch=${req.branch}&path=${path}`;
    log.info(`path: ${path}`);
    log.info(`url: ${previewUrl}`);

    const response = libs.httpClient.request({
        url: previewUrl,
        contentType: 'text/html',
    });

    if (response.body) {
        const body = JSON.parse(response.body);

        return body && body.url
            ? {
                  status: 307,
                  headers: {
                      Location: `${body.url}?didRedirect=true`,
                  },
              }
            : {
                  status: 500,
                  body: {
                      message: 'Invalid api response',
                  },
                  contentType: 'application/json',
              };
    }

    return {
        status: 404,
        body: {
            message: 'Content not found',
        },
        contentType: 'application/json',
    };
};

exports.get = handleGet;
