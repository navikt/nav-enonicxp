import graphQlLib from '/lib/graphql';
import * as contentLib from '/lib/xp/content';
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
                query: '_path LIKE "*/www.nav.no/kontor/editorial-mappe/*"',
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
                count: 2,
            });

            if (queryResult.count !== 1) {
                const errorMessage =
                    queryResult.count === 0
                        ? 'No editorial office page found'
                        : `'Multiple editorial office pages found for language '${language}'.`;
                logger.error(errorMessage);
                return queryResult.count > 0 ? queryResult.hits[0] : undefined;
            }

            // Editorial content for office pages should only have one content per language,
            // so select the first hit.
            const editorialContent = queryResult.hits[0];

            return editorialContent;
        },
    };
};
