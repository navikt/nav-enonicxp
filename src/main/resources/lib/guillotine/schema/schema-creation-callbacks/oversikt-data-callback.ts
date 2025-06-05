import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { buildFormDetailsList } from '../../../overview-pages/forms-overview/build-forms-overview-list';
import { FormDetailsListItem } from '../../../overview-pages/forms-overview/types';

export const oversiktDataCallback: CreationCallback = (context, params) => {
    const formDetailsList = graphQlCreateObjectType<keyof FormDetailsListItem>(context, {
        name: context.uniqueName('FormDetailsList'),
        description: 'Liste over sider med skjemadetaljer',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            targetLanguage: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            keywords: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formDetailsPaths: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formDetailsTitles: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formDetailsIngresses: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formNumbers: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            sortTitle: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            anchorId: { type: graphQlLib.GraphQLString },
            taxonomy: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            area: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            illustration: {
                type: graphQlLib.reference('Content'),
                resolve: (env) => {
                    const { illustration } = env.source;
                    return illustration ? contentLib.get({ key: illustration }) : illustration;
                },
            },
        },
    });

    params.fields.formDetailsList = {
        type: graphQlLib.list(formDetailsList),
        resolve: () => {
            const contentId = getGuillotineContentQueryBaseContentId();
            if (!contentId) {
                logger.error('No contentId provided for overview-page resolver');
                return [];
            }

            const content = contentLib.get({ key: contentId });
            if (content?.type !== 'no.nav.navno:forms-overview') {
                logger.error(`Content not found for forms overview page id ${contentId}`);
                return [];
            }

            return buildFormDetailsList(content);
        },
    };
};
