import { Request } from '@enonic-types/core';
import { generateAnchorIdField } from 'lib/utils/component-utils';
import { componentPreviewController } from 'lib/controllers/component-preview-controller';
import { SectionWithHeader } from '@xp-types/site/layouts';

export const get = (req: Request) => {
    if (req.mode === 'edit') {
        // The fieldDefaultValue parameter must match the default title set in the xml file
        generateAnchorIdField<SectionWithHeader>(req, 'title', 'Seksjonstittel');
    }

    return componentPreviewController(req);
};
