import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';
import { runInLocaleContext } from '../../../../lib/localization/locale-context';
import * as contentLib from '/lib/xp/content';

type Step = {
    label: string;
    nextStep?: {
        _selected: string;
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

const hasEmptyFormNumbers = (steps: Step[]): boolean => {
    return steps.some((step: Step) => {
        if (step.nextStep?._selected === 'external' && !step.nextStep.external?.formNumber) {
            return true;
        }
        if (step.nextStep?._selected === 'next' && step.nextStep.next?.steps) {
            return hasEmptyFormNumbers([step.nextStep.next.steps]);
        }
        return false;
    });
};

const updateStepFormNumbers = (
    step: Step,
    noStepsMap: Map<string, Step>,
    allSteps: Step[]
): Step => {
    // First handle the current step's form number if it's external
    if (step.nextStep?._selected === 'external' && !step.nextStep.external?.formNumber) {
        const noStep = noStepsMap.get(step.label) as Step | undefined;
        if (noStep?.nextStep?._selected === 'external' && noStep.nextStep.external?.formNumber) {
            if (step.nextStep.external) {
                step.nextStep.external.formNumber = noStep.nextStep.external.formNumber;
            }
        }
    }

    // Then handle any nested steps
    if (step.nextStep?._selected === 'next' && step.nextStep.next?.steps) {
        const noStep = noStepsMap.get(step.label) as Step | undefined;
        if (noStep?.nextStep?._selected === 'next' && noStep.nextStep.next?.steps) {
            // Update the nested step's form number
            updateStepFormNumbers(step.nextStep.next.steps, noStepsMap, allSteps);
        }
    }

    return step;
};

export const formIntermediateStepCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);

    params.fields.data.resolve = (env) => {
        // Only proceed if we're not on the Norwegian layer
        if (env.source.language !== 'no') {
            // Get the Norwegian version
            const noContent = runInLocaleContext({ locale: 'no', branch: 'draft' }, () => {
                return contentLib.get({ key: env.source._id });
            });

            if (noContent?.data?.steps) {
                const currentData = env.source.data as ContentData;

                if (hasEmptyFormNumbers(currentData.steps)) {
                    // Create a map of steps by label for easy lookup
                    const noStepsMap = new Map(
                        (noContent.data.steps as Step[]).map((step: Step) => [step.label, step])
                    );

                    // Update current layer's steps
                    contentLib.modify({
                        key: env.source._id,
                        editor: (node) => {
                            const nodeData = node.data as ContentData;
                            // First pass: update all steps
                            nodeData.steps = nodeData.steps.map((step: Step) =>
                                updateStepFormNumbers(step, noStepsMap, nodeData.steps)
                            );
                            return node;
                        },
                    });
                }
            }
        }

        return env.source.data;
    };
};
