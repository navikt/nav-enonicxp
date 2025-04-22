import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';
import { runInLocaleContext } from '../../../../lib/localization/locale-context';
import * as contentLib from '/lib/xp/content';
import { CONTENT_LOCALE_DEFAULT } from '../../../../lib/constants';
import { forceArray } from '../../../../lib/utils/array-utils';

type Step = {
    label: string;
    nextStep?: {
        _selected: 'external' | 'next';
        external?: {
            formNumber?: string;
            externalUrl?: string;
        };
        next?: {
            steps: Step[];
        };
    };
};

type ContentData = {
    steps: Step[];
};

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
            );
        }
    }

    return step;
};

export const formIntermediateStepCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);

    params.fields.data.resolve = (env) => {
        if (env.source.language !== CONTENT_LOCALE_DEFAULT) {
            const defaultLayerContent = runInLocaleContext(
                { locale: CONTENT_LOCALE_DEFAULT, branch: 'draft' },
                () => contentLib.get({ key: env.source._id })
            );

            if (defaultLayerContent?.data?.steps) {
                contentLib.modify({
                    key: env.source._id,
                    editor: (node) => {
                        const nodeData = node.data as ContentData;
                        const defaultLayerSteps = defaultLayerContent.data.steps as Step[];
                        nodeData.steps = nodeData.steps.map((step, index) =>
                            updateStepFormNumbers(step, defaultLayerSteps[index])
                        );
                        return node;
                    },
                });
            }
        }

        return env.source.data;
    };
};
