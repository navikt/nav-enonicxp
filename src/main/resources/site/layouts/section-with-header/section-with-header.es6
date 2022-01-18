const controller = require('/lib/headless/controllers/component-preview-controller');
const { generateAnchorIdField } = require('/lib/headless/component-utils');

exports.get = (req) => {
    if (req.mode === 'edit') {
        // the fieldDefaultValue parameter must match the default title set in the xml file
        generateAnchorIdField(req, 'title', 'Seksjonstittel');
    }

    return controller(req);
};
