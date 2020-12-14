const mainPageLegacy = require('./main-page-legacy');
const frontendLiveness = require('/lib/headless/frontend-liveness');
const frontendProxy = require('/lib/headless/controllers/frontend-proxy-controller');

const handleGet = (req) => {
    log.info(`req: ${JSON.stringify(req)}`);
    if (!frontendLiveness.isFrontendLive(req)) {
        return mainPageLegacy(req);
    }

    return frontendProxy(req, mainPageLegacy);
};

exports.get = handleGet;
