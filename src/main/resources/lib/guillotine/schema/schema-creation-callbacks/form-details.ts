import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';

import { CreationCallback } from '../../utils/creation-callback-utils';

export const formDetailsCallback: CreationCallback = (context, params) => {
    params.fields.targetFormDetails = {
        type: graphQlLib.reference('no_nav_navno_FormDetails'),
        resolve: (env) => {
            const { targetFormDetails } = env.source;
            const formDetails = contentLib.query({
                query: `_id = '${targetFormDetails}'`,
                count: 1,
            });
            if (formDetails.count === 0) {
                return null;
            }

            return formDetails.hits[0];
        },
    };
};
