import { generateAnchorIdField } from '../../../lib/utils/component-utils';
import { SituationFlexColsConfig } from './situation-flex-cols-config';
import { componentPreviewController } from '../../../lib/controllers/component-preview-controller';

export const get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        generateAnchorIdField<SituationFlexColsConfig>(req, 'title');
    }

    return componentPreviewController(req);
};
