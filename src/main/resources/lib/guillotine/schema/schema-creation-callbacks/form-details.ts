import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { runInContext } from '../../../../lib/context/run-in-context';
import { forceArray } from '../../../../lib/utils/array-utils';
import { FormIntermediateStepData } from '@xp-types/site/mixins/form-intermediate-step-data';
import { FormDetails } from '@xp-types/site/content-types/form-details';

import { CreationCallback } from '../../utils/creation-callback-utils';

const extractFormNumbersFromSteps = (steps: FormIntermediateStepData['steps']): string[] => {
    const numbers: string[] = [];
    const stepsArray = Array.isArray(steps) ? steps : [steps];

    stepsArray.forEach((step) => {
        if (!step || !step.nextStep) return;

        const { nextStep } = step;

        if (nextStep._selected === 'external' && nextStep.external.formNumber) {
            numbers.push(nextStep.external.formNumber);
        } else if (nextStep._selected === 'next' && nextStep.next && nextStep.next.steps) {
            const nestedNumbers = extractFormNumbersFromSteps(nextStep.next.steps);
            numbers.push(...nestedNumbers);
        }
    });

    return numbers;
};

const dedupStrings = (strings: string[]): string[] => {
    const unique: Record<string, boolean> = {};
    strings.forEach((str) => {
        if (str) unique[str] = true;
    });
    return Object.keys(unique);
};

const getFormNumbersFromVariations = (formType: FormDetails['formType']) => {
    const formNumbers = forceArray(formType).reduce((acc: string[], variation) => {
        const { _selected } = variation;
        const selectedVariation = (variation as any)[_selected];

        const subFormNumbers: string[] = [];
        forceArray(selectedVariation.variations).forEach((variationItem) => {
            if (variationItem.link._selected === 'external') {
                if (variationItem.link.external.formNumber) {
                    subFormNumbers.push(variationItem.link.external.formNumber);
                }
            }

            if (variationItem.link._selected === 'internal') {
                const intermediateStep = contentLib.get({
                    key: variationItem.link.internal.target,
                });

                if (intermediateStep && intermediateStep.data) {
                    const formNumbersFromSteps = extractFormNumbersFromSteps(
                        intermediateStep.data.steps
                    );
                    subFormNumbers.push(...formNumbersFromSteps);
                }
            }
        });

        return [...acc, ...subFormNumbers];
    }, []);

    return formNumbers;
};

export const formDetailsCallback: CreationCallback = (context, params) => {
    params.fields.data.resolve = (env) => {
        const contentId = env.source._id;

        const formNumbers = dedupStrings([
            ...forceArray(env.source.data.formNumbers),
            ...getFormNumbersFromVariations(env.source.data.formType),
        ]);

        return runInContext({ branch: 'master' }, () => {
            const alerts = contentLib.query({
                count: 10,
                contentTypes: ['no.nav.navno:alert-in-context'],
                filters: {
                    boolean: {
                        must: [
                            {
                                hasValue: {
                                    field: 'data.target.formDetails.targetContent',
                                    values: [contentId],
                                },
                            },
                        ],
                    },
                },
            });
            return {
                ...env.source.data,
                alerts: [...alerts.hits],
                formNumbers,
            };
        });
    };
};

export const formDetailsDataCallback: CreationCallback = (context, params) => {
    params.fields.alerts = {
        type: graphQlLib.list(graphQlLib.reference('no_nav_navno_AlertInContext')),
    };
    params.fields.formNumbers = {
        type: graphQlLib.list(graphQlLib.GraphQLString),
    };
};

export const formDetailsPartOrMacroCallback: CreationCallback = (context, params) => {
    params.fields.targetFormDetails = {
        type: graphQlLib.reference('no_nav_navno_FormDetails'),
        resolve: (env) => {
            return contentLib.get({ key: env.source.targetFormDetails });
        },
    };
};
