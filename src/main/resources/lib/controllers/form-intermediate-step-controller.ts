import * as portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import {
    getContentFromCustomPath,
    hasValidCustomPath,
} from '../paths/custom-paths/custom-path-utils';

const CUSTOM_PATH_PREFIX = '/start';

const generateCustomPath = (content: Content<'no.nav.navno:form-intermediate-step'>) => {
    const suggestedPath = `${CUSTOM_PATH_PREFIX}/${content._name}`;

    const contentWithCustomPath = getContentFromCustomPath(suggestedPath);
    if (
        contentWithCustomPath.length > 1 ||
        (contentWithCustomPath.length === 1 && contentWithCustomPath[0]._id !== content._id)
    ) {
        logger.critical(
            `Content with customPath ${suggestedPath} already exists: ${contentWithCustomPath
                .map((content) => content._path)
                .join(', ')}`
        );
        return null;
    }

    return suggestedPath;
};

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

    const currentCustomPath = hasValidCustomPath(content) ? content.data.customPath : null;
    const correctCustomPath = generateCustomPath(content);

    if (currentCustomPath === correctCustomPath) {
        return;
    }

    const repo = getRepoConnection({ repoId: req.repositoryId, branch: 'draft' });

    repo.modify({
        key: content._id,
        editor: (content) => {
            content.data.customPath = correctCustomPath;
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
