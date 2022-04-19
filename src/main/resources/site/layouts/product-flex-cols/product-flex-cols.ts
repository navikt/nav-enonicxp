import { generateAnchorIdField } from '../../../lib/utils/component-utils';
import { ProductFlexColsConfig } from './product-flex-cols-config';
import { componentPreviewController } from '../../../lib/controllers/component-preview-controller';

export const get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        generateAnchorIdField<ProductFlexColsConfig>(req, 'title');
    }

    return componentPreviewController(req);
};
