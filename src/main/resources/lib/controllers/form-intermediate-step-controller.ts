import { Request } from '@enonic-types/core'
import * as portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/portal';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../repos/repo-utils';
import {
    formIntermediateStepGenerateCustomPath,
    formIntermediateStepValidateCustomPath,
} from '../paths/custom-paths/custom-path-content-validators';
import {
    needsFormNumbersUpdateCheck,
    updateFormNumbersFromDefaultLayer,
} from './form-intermediate-step-utils/form-intermediate-step-form-numbers';

const validateContent = (
    content: Content | null,
    req: Request
): content is Content<'no.nav.navno:form-intermediate-step'> => {
    if (!content) {
        logger.error(`Could not get contextual content from request path - ${req.rawPath}`);
        return false;
    }
    if (content.type !== 'no.nav.navno:form-intermediate-step') {
        logger.error(
            `Invalid type for form-intermediate-step controller - ${content._id} - ${content.type}`
        );
        return false;
    }
    if (!content.valid) {
        logger.info(`Content ${content._id} is not valid - skipping updates for now`);
        return false;
    }

    return true;
};

const updateCustomPath = (content: Content<'no.nav.navno:form-intermediate-step'>) => {
    content.data.customPath = formIntermediateStepGenerateCustomPath(content);
};

const updateContent = (req: Request) => {
    const content = portalLib.getContent();
    if (!validateContent(content, req)) {
        return;
    }
    if (!req.repositoryId) {
        logger.error(`No repoId for form-intermediate-step page - ${content._id}`);
        return;
    }

    const repo = getRepoConnection({ repoId: req.repositoryId, branch: 'draft' });
    const currentContent = repo.get<Content<'no.nav.navno:form-intermediate-step'>>({
        key: content._id,
    });

    if (!currentContent) {
        return;
    }

    const needsCustomPathUpdate = !formIntermediateStepValidateCustomPath(
        currentContent.data.customPath,
        currentContent
    );
    const needsFormNumbersUpdate = needsFormNumbersUpdateCheck({
        currentContent,
        content,
    });

    if (needsCustomPathUpdate || needsFormNumbersUpdate) {
        repo.modify<Content<'no.nav.navno:form-intermediate-step'>>({
            key: content._id,
            editor: (content) => {
                if (needsCustomPathUpdate) {
                    updateCustomPath(content);
                }
                if (needsFormNumbersUpdate) {
                    updateFormNumbersFromDefaultLayer(content);
                }
                return content;
            },
        });
    }
};

const formIntermediateStepController = (req: Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        updateContent(req);
    }
    return frontendProxy(req);
};

export const get = formIntermediateStepController;
