const httpClient = require('/lib/http-client');

const nextApiUrlMap = {
    localhost: 'http://localhost:3000/api/jsonProxy',
    q6: 'https://www-q6.nav.no/api/jsonProxy',
    q1: 'https://www-q1.nav.no/api/jsonProxy',
    p: 'https://www.nav.no/api/jsonProxy',
};

const nextApiUrl = nextApiUrlMap[app.config.env] || nextApiUrlMap.p;

const handleGet = (req) => {
    const { path } = req;
    const url = `${nextApiUrl}?path=${path}`;
    log.info(`json url: ${url}`);

    return httpClient.request({
        method: 'GET',
        url: url,
    });
};

exports.get = handleGet;
