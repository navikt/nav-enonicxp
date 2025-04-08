import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { runInContext } from '../../../../lib/context/run-in-context';
import { forceArray } from '../../../../lib/utils/array-utils';

import { CreationCallback } from '../../utils/creation-callback-utils';

const getFormNumbersFromVariations = (formType: any) => {
    const formNumbers = formType.reduce((acc: any, variation: any) => {
        const { _selected } = variation;

        // log.info(JSON.stringify(variation, null, 2));

        const subFormNumbers: any[] = [];
        forceArray(variation[_selected].variations).forEach((variationItem: any) => {
            if (variationItem.link._selected === 'external') {
                if (variationItem.link.external.formNumber) {
                    subFormNumbers.push(variationItem.link.external.formNumber);
                }
            }

            if (variationItem.link._selected === 'internal') {
                // 1. Get the intermediate step object
                const intermediateStep = contentLib.get({
                    key: variationItem.link.internal.target,
                });

                if (intermediateStep && intermediateStep.data) {
                    // Handle single step case
                    if (
                        intermediateStep.data.steps &&
                        intermediateStep.data.steps.nextStep &&
                        intermediateStep.data.steps.nextStep._selected === 'external' &&
                        intermediateStep.data.steps.nextStep.external.formNumber
                    ) {
                        subFormNumbers.push(
                            intermediateStep.data.steps.nextStep.external.formNumber
                        );
                    }

                    // Handle array of steps case
                    if (Array.isArray(intermediateStep.data.steps)) {
                        intermediateStep.data.steps.forEach((step: any) => {
                            if (
                                step.nextStep &&
                                step.nextStep._selected === 'external' &&
                                step.nextStep.external.formNumber
                            ) {
                                subFormNumbers.push(step.nextStep.external.formNumber);
                            }
                        });
                    }
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

        const formNumbers = getFormNumbersFromVariations(env.source.data.formType);

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
