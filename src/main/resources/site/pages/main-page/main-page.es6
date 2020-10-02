const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    httpClient: require('/lib/http-client'),
};

const legacySource = '/_/service/legacy';
const view = resolve('/site/pages/main-page/main-page.html');

// TODO: denne funksjonaliteten finnes kanskje allerede? :)
const frontendOriginMap = {
    localhost: 'http://localhost:3000',
    q6: 'https://www-q6.nav.no',
    q1: 'https://www-q1.nav.no',
    p: 'https://www.nav.no',
};

const frontendOrigin = frontendOriginMap[app.config.env] || frontendOriginMap.p;

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
    log.info('main-page controller req-object:');
    Object.keys(req).forEach((k) => log.info(`key: ${k} - value: ${req[k]}`));

    if (req.path.startsWith(legacySource)) {
        return generateLegacyHtml();
    }

    if (req.method !== 'GET') {
        return {
            status: 200,
        };
    }

    const path = req.rawPath.split('/www.nav.no').splice(1).join('/');
    const url = `${frontendOrigin}${req.branch === 'draft' ? '/draft' : ''}${path}`;
    log.info(`requesting html from frontend: ${url}`);

    const html = libs.httpClient.request({
        url: `${frontendOrigin}${req.branch === 'draft' ? '/draft' : ''}${path}`,
        contentType: 'text/html',
    });

    return (
        html || {
            status: 500,
            body: {
                message: 'No response from frontend',
            },
            contentType: 'application/json',
        }
    );
};

exports.get = handleGet;
