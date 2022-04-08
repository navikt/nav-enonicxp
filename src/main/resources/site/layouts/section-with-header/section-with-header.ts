import { generateAnchorIdField } from '../../../lib/utils/component-utils';
import { SectionWithHeaderConfig } from './section-with-header-config';

const controller = require('/lib/controllers/component-preview-controller');

exports.get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        // the fieldDefaultValue parameter must match the default title set in the xml file
        generateAnchorIdField<SectionWithHeaderConfig>(req, 'title', 'Seksjonstittel');
    }

    return controller(req);
};
