import { Content } from '/lib/xp/portal';
import { runInLocaleContext } from '../../localization/locale-context';
import * as contentLib from '/lib/xp/content';
import { forceArray } from '../../utils/array-utils';
import { FormIntermediateStep } from '@xp-types/site/content-types/form-intermediate-step';
import { CONTENT_LOCALE_DEFAULT } from '../../constants';

type Step = FormIntermediateStep['steps'][number];

export const needsFormNumbersUpdateCheck = (
    currentContent: Content<'no.nav.navno:form-intermediate-step'>,
    content: Content<'no.nav.navno:form-intermediate-step'>
): boolean => {
    return forceArray(currentContent.data.steps).some((step) => {
        if (step.nextStep?._selected === 'external') {
            return (
                content.language !== CONTENT_LOCALE_DEFAULT && !step.nextStep.external?.formNumber
            );
        }
        return false;
    });
};

export const updateStepFormNumbers = (step: Step, defaultLayerStep: Step | undefined): Step => {
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

export const updateFormNumbersFromDefaultLayer = (
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
