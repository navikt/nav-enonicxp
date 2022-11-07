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

                count: 2,
            });

            const acceptedEditorial = queryResult.hits.filter((content) =>
                content._path.includes('/www.nav.no/person/kontorinnhold/')
            );

            if (acceptedEditorial.length !== 1) {
                const errorMessage =
                    acceptedEditorial.length === 0
                        ? 'No editorial office page found'
                        : `'Multiple editorial office pages found for language '${language}'.`;
                logger.error(errorMessage);
                return acceptedEditorial.length > 0 ? acceptedEditorial[0] : undefined;
            }

            // Editorial content for office pages should only have one content per language,
            // so select the first hit.
            return acceptedEditorial[0];
        },
    };
};
