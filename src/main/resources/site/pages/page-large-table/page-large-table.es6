const frontendProxyController = require('/lib/headless/controllers/frontend-proxy-controller');
const frontendLiveness = require('/lib/headless/frontend-liveness');
const pageLargeTableLegacy = require('./page-large-table-legacy');

exports.get = function (req) {
    if (!frontendLiveness.shouldTryNewFrontend(req)) {
        return pageLargeTableLegacy(req);
    }

    return frontendProxyController(req, pageLargeTableLegacy);
};
