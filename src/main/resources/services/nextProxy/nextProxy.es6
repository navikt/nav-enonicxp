const { frontendOrigin } = require('/lib/headless/url-origin');

const nextApiUrl = `${frontendOrigin}/api/json-proxy`;

const handleGet = (req) => {
    const { path } = req;
    const url = `${nextApiUrl}?path=${path}`;
    log.info(`Requesting frontend asset from: ${url}`);

    return {
        status: 200,
    };
};

exports.get = handleGet;
