const frontendProxyController = require('/lib/headless/controllers/frontend-proxy-controller');
const frontendLiveness = require('/lib/headless/frontend-liveness');
const pageLargeTableLegacy = require('./page-large-table-legacy');

exports.get = function (req) {
    log.info('page-large-table controller req-object:');
    Object.keys(req).forEach((k) => log.info(`key: ${k} - value: ${req[k]}`));

    if (!frontendLiveness.isLive(req)) {
        return pageLargeTableLegacy(req);
    }

    return frontendProxyController(req, pageLargeTableLegacy);
};
