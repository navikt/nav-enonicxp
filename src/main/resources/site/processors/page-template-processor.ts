import * as portalLib from '/lib/xp/portal';
import * as nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { frontendProxy } from '../../lib/controllers/frontend-proxy';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { logger } from '../../lib/utils/logging';

const contentTypesToMigrate: { [key in ContentDescriptor]?: true } = {
    'no.nav.navno:form-intermediate-step': true,
    'no.nav.navno:area-page': true,
    'no.nav.navno:current-topic-page': true,
    'no.nav.navno:front-page': true,
    'no.nav.navno:press-landing-page': true,
    'no.nav.navno:situation-page': true,
    'no.nav.navno:tools-page': true,
    'no.nav.navno:generic-page': true,
    'no.nav.navno:guide-page': true,
    'no.nav.navno:themed-article-page': true,
    'no.nav.navno:content-page-with-sidemenus': true,
};

export const audienceMigration = (content: Content, repoId: string) => {
    if (!content) {
        logger.warning('No content specified for audience migration');
        return false;
    }

    if (!repoId) {
        logger.warning('No repo id specified for audience migration');
        return false;
    }

    if (!contentTypesToMigrate[content.type]) {
        return false;
    }

    const audience = (content.data as any)?.audience;
    if (typeof audience !== 'string') {
        return false;
    }

    const repo = nodeLib.connect({
        repoId,
        branch: 'draft',
    });

    try {
        repo.modify({
            key: content._id,
            editor: (node) => {
                const oldAudience = node.data.audience;
                if (typeof oldAudience !== 'string') {
                    return node;
                }

                node.data.audience = { _selected: oldAudience };
                return node;
            },
        });

        logger.info(`Migrated ${content._path} in repo ${repoId} successfully!`);
        return true;
    } catch (e) {
        logger.error(`Error while migrating audience: ${e}`);
        return false;
    }
};

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
