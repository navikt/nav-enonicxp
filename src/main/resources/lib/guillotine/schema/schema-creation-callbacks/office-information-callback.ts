import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const officeInformationLegacyCallback: CreationCallback = (context, params) => {
    params.fields.editorial = {
        args: { contentId: graphQlLib.GraphQLID },
        type: graphQlLib.reference('no_nav_navno_OfficeInformation'),
        resolve: (env) => {
            log.info('officeInformationLegacyCallback');
            return env.source;
        },
    };
};
