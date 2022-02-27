import { generateAnchorIdField } from '../../../lib/headless/component-utils';
import { SituationFlexColsConfig } from './situation-flex-cols-config';

const controller = require('/lib/controllers/component-preview-controller');

exports.get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        generateAnchorIdField<SituationFlexColsConfig>(req, 'title');
    }

    return controller(req);
};
