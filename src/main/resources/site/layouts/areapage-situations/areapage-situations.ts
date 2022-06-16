import { componentPreviewController } from '../../../lib/controllers/component-preview-controller';

const generateSituationPart = () => {
    return null;
};

export const get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        generateSituationPart();
    }

    return componentPreviewController(req);
};
