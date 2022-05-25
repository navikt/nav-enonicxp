import portalLib from '/lib/xp/portal';
import { adminFrontendProxy } from '../../lib/controllers/admin-frontend-proxy';
import { contentTypesRenderedByEditorFrontend } from '../../lib/contenttype-lists';
import { stringArrayToSet } from '../../lib/utils/nav-utils';

const contentTypesForFrontendProxy = stringArrayToSet(contentTypesRenderedByEditorFrontend);

export const responseProcessor = (req: XP.Request, res: XP.Response) => {
    const content = portalLib.getContent();
    if (!content) {
        return res;
    }

    // Empty page templates should not be rendered by the frontend. We want the default
    // view from XP, which is the page-controller selector
    if (content.type === 'portal:page-template' && !content.page?.descriptor) {
        return res;
    }

    // Content types with a supported frontend view should be rendered by the frontend
    if (contentTypesForFrontendProxy[content.type]) {
        return adminFrontendProxy(req);
    }

    // For everything else, just use the default response
    return res;
};
