import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';

import { CreationCallback } from '../../utils/creation-callback-utils';
import { generateAlerts } from '../../utils/alerts';

export const formDetailsCallback: CreationCallback = (context, params) => {
    params.fields.data.resolve = (env) => {
        const contentId = env.source._id;

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
        };
    };
};

export const formDetailsDataCallback: CreationCallback = (context, params) => {
    params.fields.alerts = {
        type: graphQlLib.list(graphQlLib.reference('no_nav_navno_AlertInContext')),
    };
};

export const partFormDetailsCallback: CreationCallback = (context, params) => {
    params.fields.targetFormDetails = {
        type: graphQlLib.reference('no_nav_navno_FormDetails'),
        resolve: (env) => {
            const content = contentLib.get({ key: env.source.targetFormDetails });
            if (!content) {
                return null;
            }
            const alerts = generateAlerts(content);

            return {
                ...content,
                alerts,
            };
        },
    };
};
