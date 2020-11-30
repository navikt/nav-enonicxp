const httpClient = require('/lib/http-client');
const frontendOrigin = require('/lib/headless-utils/frontend-origin');

const nextApiUrl = `${frontendOrigin}/api/json-proxy`;

const handleGet = (req) => {
    const { path } = req;
    const url = `${nextApiUrl}?path=${path}`;
    log.info(`Requesting frontend asset from: ${url}`);

    return httpClient.request({
        method: 'GET',
        url: url,
    });
};

exports.get = handleGet;
