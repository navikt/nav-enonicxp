const controller = require('/lib/headless/controllers/admin-frontend-proxy');

const errorResponse = {
    contentType: 'text/html',
    body: `<div>Dette innholdet er kun tilgjengelig i content studio</div>`,
    status: 403,
};

const handleGet = (req) => {
    return controller.get(req);
};

exports.get = handleGet;
