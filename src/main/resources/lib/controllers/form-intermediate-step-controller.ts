import * as portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/portal';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../repos/repo-utils';
import {
    formIntermediateStepGenerateCustomPath,
    formIntermediateStepValidateCustomPath,
} from '../paths/custom-paths/custom-path-content-validators';
import { CONTENT_LOCALE_DEFAULT } from '../constants';
import { runInLocaleContext } from '../localization/locale-context';
import * as contentLib from '/lib/xp/content';
import { forceArray } from '../utils/array-utils';
import { FormIntermediateStep } from '@xp-types/site/content-types/form-intermediate-step';

type Step = FormIntermediateStep['steps'][number];

const updateStepFormNumbers = (step: Step, defaultLayerStep: Step | undefined): Step => {
    if (!defaultLayerStep) {
        return step;
    }

    if (step.nextStep?._selected === 'external' && !step.nextStep.external?.formNumber) {
        if (
            defaultLayerStep.nextStep?._selected === 'external' &&
            defaultLayerStep.nextStep.external?.formNumber
        ) {
            if (step.nextStep.external) {
                step.nextStep.external.formNumber = defaultLayerStep.nextStep.external.formNumber;
            }
        }
    }

    if (step.nextStep?._selected === 'next' && step.nextStep.next?.steps) {
        if (
            defaultLayerStep.nextStep?._selected === 'next' &&
            defaultLayerStep.nextStep.next?.steps
        ) {
            const currentSteps = forceArray(step.nextStep.next.steps);
            const defaultSteps = forceArray(defaultLayerStep.nextStep.next.steps);

            step.nextStep.next.steps = currentSteps.map((currentStep, index) =>
                updateStepFormNumbers(currentStep, defaultSteps[index])
            ) as typeof step.nextStep.next.steps;
        }
    }

    return step;
};

const updateFormNumbersFromDefaultLayer = (
    content: Content<'no.nav.navno:form-intermediate-step'>
) => {
    if (content.language !== CONTENT_LOCALE_DEFAULT) {
        const defaultLayerContent = runInLocaleContext(
            { locale: CONTENT_LOCALE_DEFAULT, branch: 'draft' },
            () => contentLib.get({ key: content._id })
        );

        if (defaultLayerContent?.data?.steps) {
            const needsUpdate = content.data.steps.some((step, index) => {
                const defaultStep = defaultLayerContent.data.steps[index];
                if (
                    step.nextStep?._selected === 'external' &&
                    !step.nextStep.external?.formNumber
                ) {
                    return (
                        defaultStep.nextStep?._selected === 'external' &&
                        defaultStep.nextStep.external?.formNumber
                    );
                }
                return false;
            });

            if (needsUpdate) {
                content.data.steps = content.data.steps.map((step, index) =>
                    updateStepFormNumbers(step, defaultLayerContent.data.steps[index])
                );
            }
        }
    }
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

    if (!content.valid) {
        logger.info(`Content ${content._id} is not valid - skipping customPath generation for now`);
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
    const needsFormNumbersUpdate = currentContent.data.steps.some((step) => {
        if (step.nextStep?._selected === 'external') {
            return (
                content.language !== CONTENT_LOCALE_DEFAULT && !step.nextStep.external?.formNumber
            );
        }
        return false;
    });

    if (needsCustomPathUpdate || needsFormNumbersUpdate) {
        repo.modify<Content<'no.nav.navno:form-intermediate-step'>>({
            key: content._id,
            editor: (content) => {
                if (needsCustomPathUpdate) {
                    content.data.customPath = formIntermediateStepGenerateCustomPath(content);
                }
                if (needsFormNumbersUpdate) {
                    updateFormNumbersFromDefaultLayer(content);
                }
                return content;
            },
        });
    }
};

const formIntermediateStepController = (req: XP.Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        insertCustomPath(req);
    }

    return frontendProxy(req);
};

export const get = formIntermediateStepController;
