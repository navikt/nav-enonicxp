const httpClient = require('/lib/http-client');
const frontendOriginMap = require('/lib/headless-utils/frontend-origin.es6');

const nextApiUrl = `${frontendOriginMap[app.config.env] || frontendOriginMap.p}/api/jsonProxy`;

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
