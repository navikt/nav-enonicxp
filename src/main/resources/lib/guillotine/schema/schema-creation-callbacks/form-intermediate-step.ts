import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';
import { runInLocaleContext } from '../../../../lib/localization/locale-context';
import * as contentLib from '/lib/xp/content';

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

const hasEmptyFormNumbers = (steps: Step[]): boolean => {
    return steps.some((step) => {
        if (step.nextStep?._selected === 'external' && !step.nextStep.external?.formNumber) {
            return true;
        }
        if (step.nextStep?._selected === 'next' && step.nextStep.next?.steps) {
            return hasEmptyFormNumbers([step.nextStep.next.steps]);
        }
        return false;
    });
};

const updateStepFormNumbers = (step: Step, noStepsMap: Map<string, Step>): Step => {
    if (step.nextStep?._selected === 'external' && !step.nextStep.external?.formNumber) {
        const noStep = noStepsMap.get(step.label);
        if (noStep?.nextStep?._selected === 'external' && noStep.nextStep.external?.formNumber) {
            if (step.nextStep.external) {
                step.nextStep.external.formNumber = noStep.nextStep.external.formNumber;
            }
        }
    }

    if (step.nextStep?._selected === 'next' && step.nextStep.next?.steps) {
        const noStep = noStepsMap.get(step.label);
        if (noStep?.nextStep?._selected === 'next' && noStep.nextStep.next?.steps) {
            updateStepFormNumbers(step.nextStep.next.steps, noStepsMap);
        }
    }

    return step;
};

export const formIntermediateStepCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);

    params.fields.data.resolve = (env) => {
        if (env.source.language !== 'no') {
            const noContent = runInLocaleContext({ locale: 'no', branch: 'draft' }, () =>
                contentLib.get({ key: env.source._id })
            );

            if (noContent?.data?.steps) {
                const currentData = env.source.data as ContentData;

                if (hasEmptyFormNumbers(currentData.steps)) {
                    const noStepsMap = new Map<string, Step>(
                        (noContent.data.steps as Step[]).map((step) => [step.label, step])
                    );

                    contentLib.modify({
                        key: env.source._id,
                        editor: (node) => {
                            const nodeData = node.data as ContentData;
                            nodeData.steps = nodeData.steps.map((step) =>
                                updateStepFormNumbers(step, noStepsMap)
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
