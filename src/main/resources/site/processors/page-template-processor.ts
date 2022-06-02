import portalLib from '/lib/xp/portal';
import { adminFrontendProxy } from '../../lib/controllers/admin-frontend-proxy';

// This is a post-processing step which runs after the request has gone through the regular request pipeline. We do some
// special silly handling of the page-template type, in order to get the page-controller selector for empty
// page-templates to show up correctly in content studio.
export const responseProcessor = (req: XP.Request, res: XP.Response) => {
    const content = portalLib.getContent();

    // We do NOT map the portal:page-template type to the adminFrontendProxy controller in our site mappings. Instead,
    // we let it through the regular XP request pipeline and only send it through the frontend-proxy if the template
    // is not empty. For empty templates, we only want to show the default response.
    if (content.type === 'portal:page-template' && content.page?.descriptor) {
        return adminFrontendProxy(req);
    }

    return res;
};
