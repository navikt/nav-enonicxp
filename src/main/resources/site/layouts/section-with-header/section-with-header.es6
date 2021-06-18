const controller = require('/lib/headless/controllers/component-preview-controller');
const { generateAnchorIdField } = require('/lib/headless/component-utils');

exports.get = (req) => {
    if (req.mode === 'edit') {
        generateAnchorIdField(req, 'title', 'Seksjonstittel');
    }

    return controller(req);
};
