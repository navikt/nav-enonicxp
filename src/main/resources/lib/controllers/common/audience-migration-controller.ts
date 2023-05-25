import { Content } from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { logger } from '../../utils/logging';

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
