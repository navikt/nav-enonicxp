const mainPageLegacy = require('./main-page-legacy');
const frontendLiveness = require('/lib/headless/frontend-liveness');
const frontendProxy = require('/lib/headless/controllers/frontend-proxy-controller');

const handleGet = (req) => {
    if (!frontendLiveness.isLive(req)) {
        return mainPageLegacy(req);
    }

    return frontendProxy(req, mainPageLegacy);
};

exports.get = handleGet;
