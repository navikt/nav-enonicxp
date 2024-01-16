import graphQlLib from '/lib/graphql';
import * as contentLib from '/lib/xp/content';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { CONTENT_LOCALE_DEFAULT } from '../../../constants';

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

            if (officeDataContent.type !== 'no.nav.navno:office-branch') {
                logger.info('Content found, but it is not the excepted type of office-branch');
                return;
            }

            const skriftspraak = officeDataContent.data.brukerkontakt?.skriftspraak;
            const type = officeDataContent.data.type;

            // The field skriftspraak in NORG is an open text field, so uppercase
            // before checking.
            const language = skriftspraak?.toUpperCase() === 'NN' ? 'nn' : CONTENT_LOCALE_DEFAULT;

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
                            {
                                hasValue: {
                                    field: 'data.type',
                                    values: [type],
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
