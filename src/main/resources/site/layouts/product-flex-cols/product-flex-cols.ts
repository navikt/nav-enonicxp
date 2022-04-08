import { generateAnchorIdField } from '../../../lib/utils/component-utils';
import { ProductFlexColsConfig } from './product-flex-cols-config';

const controller = require('/lib/controllers/component-preview-controller');

exports.get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        generateAnchorIdField<ProductFlexColsConfig>(req, 'title');
    }

    return controller(req);
};
