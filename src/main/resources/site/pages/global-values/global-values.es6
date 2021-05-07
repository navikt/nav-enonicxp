const controller = require('/lib/headless/controllers/admin-frontend-proxy');

const test = (req) => {
    log.info(`Page req: ${JSON.stringify(req)}`);

    return controller.get(req);
};

exports.get = test;
