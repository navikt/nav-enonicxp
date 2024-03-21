import { generateAnchorIdField } from '../../../lib/utils/component-utils';
import { componentPreviewController } from '../../../lib/controllers/component-preview-controller';
import { SituationFlexCols } from '@xp-types/site/layouts';

export const get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        generateAnchorIdField<SituationFlexCols>(req, 'title');
    }

    return componentPreviewController(req);
};
