import graphQlLib from '/lib/graphql';
import contentLib from '/lib/xp/content';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';

export const officeBranchCallback: CreationCallback = (context, params) => {
    params.fields.editorial = {
        args: { contentId: graphQlLib.GraphQLID },
        type: graphQlLib.reference('no_nav_navno_OfficeEditorialPage'),
        resolve: (env) => {
            const { contentId } = env.args;

            const officeDataContent = contentLib.get({ key: contentId });

            if (!officeDataContent) {
                logger.info('No content found');
                return;
            }

            const { language = 'no' } = officeDataContent;

            const queryResult = contentLib.query({
                contentTypes: ['no.nav.navno:office-editorial-page'],
                filters: {
                    boolean: {
                        must: [
                            {
                                hasValue: {
                                    field: 'language',
                                    values: [language],
                                },
                            },
                        ],
                    },
                },

                count: 1,
            });

            if (queryResult.count === 0) {
                return;
            }

            // Editorial content for office pages should only have one content per language,
            // so select the first hit.
            const editorialContent = queryResult.hits[0];

            const testResult = contentLib.get({ key: editorialContent._id });
            if (!testResult) {
                return null;
            }

            return editorialContent;
        },
    };
};
