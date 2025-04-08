import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { runInContext } from '../../../../lib/context/run-in-context';
import { forceArray } from '../../../../lib/utils/array-utils';

import { CreationCallback } from '../../utils/creation-callback-utils';

const getFormNumbersFromVariations = (formType: any) => {
    const formNumbers = formType.reduce((acc: any, variation: any) => {
        const { _selected } = variation;

        // log.info(JSON.stringify(variation, null, 2));

        const subFormNumbers = forceArray(variation[_selected].variations).map(
            (variationItem: any) => {
                if (variationItem.link._selected === 'external') {
                    log.info('external');
                    log.info(JSON.stringify(variationItem.link.external.url, null, 2));
                    return variationItem.link.external.url;
                }

                if (variationItem.link._selected === 'internal') {
                    log.info('internal');
                    log.info(JSON.stringify(variationItem.link.internal.target, null, 2));

                    // 1. Get the intermediate step object
                    const intermediateStep = contentLib.get({
                        key: variationItem.link.internal.target,
                    });

                    log.info(JSON.stringify(intermediateStep, null, 2));

                    // 2. Parse the entire object (if found), looking for URL's
                    // 3. Parse URL's for formNumber extraction.
                }
            }
        );

        // log.info(JSON.stringify(subFormNumbers, null, 2));
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
