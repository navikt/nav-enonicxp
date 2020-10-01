const httpClient = require('/lib/http-client');

const nextApiUrlMap = {
    localhost: 'http://localhost:3000/api/csProxy',
    q6: 'https://www-q6.nav.no/api/csProxy',
    q1: 'https://www-q1.nav.no/api/csProxy',
    p: 'https://www.nav.no/api/csProxy',
};

const secret = 'qwer';

const nextApiUrl = nextApiUrlMap[app.config.env] || nextApiUrlMap.p;

const handleGet = (req) => {
    const { path } = req;
    log.info(`proxied path: ${path}`);

    return httpClient.request({
        url: `${nextApiUrl}?secret=${secret}&path=${path}`,
    });
};

exports.get = handleGet;
