import * as portalLib from '/lib/xp/portal';
import { frontendProxy } from '../../lib/controllers/frontend-proxy';
import { audienceMigration } from '../../lib/controllers/common/audience-migration-controller';

// This is a post-processing step which runs after the request has gone through the regular request pipeline. We do some
// special silly handling of the page-template type, in order to get the page-controller selector for empty
// page-templates to show up correctly in content studio.
export const responseProcessor = (req: XP.Request, res: XP.Response) => {
    const content = portalLib.getContent();

    // Migrate audience data from the old to the new model. Can be removed once all contents has been
    // updated to the new model
    if (req.mode === 'edit' || req.mode === 'inline') {
        audienceMigration(content, req.repositoryId);
    }

    // We do NOT map the portal:page-template type to the adminFrontendProxy controller in our site mappings. Instead,
    // we let it through the regular XP request pipeline and only send it through the frontend-proxy if the template
    // is not empty. For empty templates, we only want to show the default response.
    if (content.type === 'portal:page-template' && content.page?.descriptor) {
        return frontendProxy(req);
    }

    return res;
};
