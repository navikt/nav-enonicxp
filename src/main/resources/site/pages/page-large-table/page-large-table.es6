const frontendProxyController = require('/lib/headless-utils/frontend-proxy-controller.es6');
const frontendLiveness = require('/lib/headless-utils/frontend-liveness.es6');
const pageLargeTableLegacy = require('./page-large-table-legacy.es6');

exports.get = function (req) {
    log.info('page-large-table controller req-object:');
    Object.keys(req).forEach((k) => log.info(`key: ${k} - value: ${req[k]}`));

    if (!frontendLiveness.isLive(req)) {
        return pageLargeTableLegacy(req);
    }

    return frontendProxyController(req, pageLargeTableLegacy);
};
