import { generateAnchorIdField } from '../../../lib/utils/component-utils';
import { SectionWithHeaderConfig } from './section-with-header-config';
import { componentPreviewController } from '../../../lib/controllers/component-preview-controller';

export const get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        // The fieldDefaultValue parameter must match the default title set in the xml file
        generateAnchorIdField<SectionWithHeaderConfig>(req, 'title', 'Seksjonstittel');
    }

    return componentPreviewController(req);
};
