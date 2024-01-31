import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';

import { CreationCallback } from '../../utils/creation-callback-utils';
import { generateAlerts } from '../../utils/alerts';

export const formDetailsCallback: CreationCallback = (context, params) => {
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
