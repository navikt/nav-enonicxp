import portalLib from '/lib/xp/portal';
import { adminFrontendProxy } from './admin-frontend-proxy';

// For unconfigured page-templates we want to send the request to the standard XP controller
// in order to show the page-controller selector in the editor
export const filter = (req: XP.Request, next: any) => {
    const content = portalLib.getContent();
    if (content?.type === 'portal:page-template' && !content.page?.descriptor) {
        return next(req);
    }

    return adminFrontendProxy(req);
};
