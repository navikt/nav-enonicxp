import { Request } from '@enonic-types/core';
import { generateAnchorIdField } from '../../../lib/utils/component-utils';
import { componentPreviewController } from '../../../lib/controllers/component-preview-controller';
import { ProductFlexCols } from '@xp-types/site/layouts';

export const get = (req: Request) => {
    if (req.mode === 'edit') {
        generateAnchorIdField<ProductFlexCols>(req, 'title');
    }

    return componentPreviewController(req);
};
