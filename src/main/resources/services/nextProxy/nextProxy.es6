const httpClient = require('/lib/http-client');

const nextSiteHostnameMap = {
    localhost: 'http://localhost:3000',
    q6: 'https://www-q6.nav.no',
    q1: 'https://www-q1.nav.no',
    p: 'https://www.nav.no',
};

const nextSiteHostname = nextSiteHostnameMap[app.config.env] || nextSiteHostnameMap.p;

const handleGet = (req) => {
    const { path } = req;
    log.info(`json path: ${path}`);

    const pathSegments = path.replace('/www.nav.no', '').split('/');

    const nextPrefixPath = path.split('/').slice(0, 4).join('/');
    const nextJsonPath = pathSegments.slice(9).join('/');
    log.info(`json path from admin: ${nextJsonPath}`);

    const nextUrl = `${nextSiteHostname}${
        pathSegments[4] === 'admin' ? `${nextPrefixPath}/${nextJsonPath}` : path
    }`;
    log.info(`full json url: ${nextUrl}`);

    const json = httpClient.request({
        url: nextUrl,
        contentType: 'application/json',
    });

    return json;
};

exports.get = handleGet;
