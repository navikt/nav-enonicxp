const mainPageLegacy = require('./main-page-legacy');
const frontendLiveness = require('/lib/headless-utils/frontend-liveness');
const frontendProxy = require('/lib/headless-utils/frontend-proxy-controller');

const handleGet = (req) => {
    log.info('main-page controller req-object:');
    Object.keys(req).forEach((k) => log.info(`key: ${k} - value: ${req[k]}`));

    if (!frontendLiveness.isLive(req)) {
        return mainPageLegacy(req);
    }

    return frontendProxy(req);
};

exports.get = handleGet;
