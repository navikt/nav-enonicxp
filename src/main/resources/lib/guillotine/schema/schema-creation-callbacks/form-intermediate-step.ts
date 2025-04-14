import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';
import { runInLocaleContext } from '../../../../lib/localization/locale-context';
import * as contentLib from '/lib/xp/content';
import { CONTENT_LOCALE_DEFAULT } from '../../../../lib/constants';

// Type definitions for the form step structure
type Step = {
    label: string;
    nextStep?: {
        _selected: 'external' | 'next';
        external?: {
            formNumber?: string;
            externalUrl?: string;
        };
        next?: {
            steps: Step;
        };
    };
};

type ContentData = {
    steps: Step[];
};

// Update form numbers in the current step by copying from the default language layer
const updateStepFormNumbers = (step: Step, defaultLayerStepsMap: Map<string, Step>): Step => {
    // Check if current step is external and missing form number
    if (step.nextStep?._selected === 'external' && !step.nextStep.external?.formNumber) {
        // Get corresponding step from default language layer
        const defaultLayerStep = defaultLayerStepsMap.get(step.label);
        // If default language step has a form number, copy it
        if (
            defaultLayerStep?.nextStep?._selected === 'external' &&
            defaultLayerStep.nextStep.external?.formNumber
        ) {
            if (step.nextStep.external) {
                step.nextStep.external.formNumber = defaultLayerStep.nextStep.external.formNumber;
            }
        }
    }

    // If current step has nested steps, process them recursively
    if (step.nextStep?._selected === 'next' && step.nextStep.next?.steps) {
        const defaultLayerStep = defaultLayerStepsMap.get(step.label);
        if (
            defaultLayerStep?.nextStep?._selected === 'next' &&
            defaultLayerStep.nextStep.next?.steps
        ) {
            updateStepFormNumbers(step.nextStep.next.steps, defaultLayerStepsMap);
        }
    }

    return step;
};

// Main callback that handles form number synchronization
export const formIntermediateStepCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);

    params.fields.data.resolve = (env) => {
        // Only process non-default language content
        if (env.source.language !== CONTENT_LOCALE_DEFAULT) {
            // Get the default language version of the content
            const defaultLayerContent = runInLocaleContext(
                { locale: CONTENT_LOCALE_DEFAULT, branch: 'draft' },
                () => contentLib.get({ key: env.source._id })
            );

            if (defaultLayerContent?.data?.steps) {
                // Create a map of default language steps for quick lookup
                const defaultLayerStepsMap = new Map<string, Step>(
                    (defaultLayerContent.data.steps as Step[]).map((step) => [step.label, step])
                );

                // Update the content with synchronized form numbers
                contentLib.modify({
                    key: env.source._id,
                    editor: (node) => {
                        const nodeData = node.data as ContentData;
                        nodeData.steps = (env.source.data as ContentData).steps.map((step) =>
                            updateStepFormNumbers(step, defaultLayerStepsMap)
                        );
                        return node;
                    },
                });
            }
        }

        return env.source.data;
    };
};
