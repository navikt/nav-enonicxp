import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';

import { CreationCallback } from '../../utils/creation-callback-utils';

export const formDetailsCallback: CreationCallback = (context, params) => {
    params.fields.targetFormDetails = {
        type: graphQlLib.reference('no_nav_navno_FormDetails'),
        resolve: (env) => {
            return contentLib.get({ key: env.source.targetFormDetails });
        },
    };
};
