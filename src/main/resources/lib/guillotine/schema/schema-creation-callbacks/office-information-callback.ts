import graphQlLib from '/lib/graphql';
import * as contentLib from '/lib/xp/content';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const officeInformationLegacyCallback: CreationCallback = (context, params) => {
    params.fields.editorial = {
        args: { contentId: graphQlLib.GraphQLID },
        type: graphQlLib.reference('no_nav_navno_OfficeInformation'),
        resolve: (env) => {
            return env.source;
        },
    };
};
