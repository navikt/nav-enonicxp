import * as portalLib from '/lib/xp/portal';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import {
    formIntermediateStepGenerateCustomPath,
    formIntermediateStepValidateCustomPath,
} from '../paths/custom-paths/custom-path-special-types';

const insertCustomPath = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (!content) {
        logger.error(`Could not get contextual content from request path - ${req.rawPath}`);
        return;
    }

    if (content.type !== 'no.nav.navno:form-intermediate-step') {
        logger.error(
            `Invalid type for form-intermediate-step controller - ${content._id} - ${content.type}`
        );
        return;
    }

    if (!content.valid) {
        logger.info(`Content ${content._id} is not valid - skipping customPath generation for now`);
        return;
    }

    if (formIntermediateStepValidateCustomPath(content.data.customPath, content)) {
        return;
    }

    const repo = getRepoConnection({ repoId: req.repositoryId, branch: 'draft' });

    repo.modify({
        key: content._id,
        editor: (content) => {
            content.data.customPath = formIntermediateStepGenerateCustomPath(content);
            return content;
        },
    });
};

const formIntermediateStepController = (req: XP.Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        insertCustomPath(req);
    }

    return frontendProxy(req);
};

export const get = formIntermediateStepController;
