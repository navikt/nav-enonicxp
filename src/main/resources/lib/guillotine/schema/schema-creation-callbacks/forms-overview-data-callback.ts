import * as contentLib from '/lib/xp/content';
import {
    FieldResolver,
    ObjectTypeDefinition,
    SchemaExtension,
} from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { buildFormDetailsList } from '../../../overview-pages/forms-overview-v2/build-forms-overview-list';
import { FormDetailsListItem } from '../../../overview-pages/forms-overview-v2/types';

const FORM_DETAILS_LIST_TYPE = 'FormDetailsList';

export const formsOverviewDataCallback: SchemaExtension = (graphQL, typeName) => {
    const formDetailsListType: ObjectTypeDefinition<keyof FormDetailsListItem> = {
        description: 'Liste over sider med skjemadetaljer',
        fields: {
            url: { type: graphQL.GraphQLString },
            type: { type: graphQL.GraphQLString },
            targetLanguage: { type: graphQL.GraphQLString },
            ingress: { type: graphQL.GraphQLString },
            formDetailsPaths: { type: graphQL.list(graphQL.GraphQLString) },
            formDetailsTitles: { type: graphQL.list(graphQL.GraphQLString) },
            formDetailsIngresses: { type: graphQL.list(graphQL.GraphQLString) },
            formNumbers: { type: graphQL.list(graphQL.GraphQLString) },
            sortTitle: { type: graphQL.GraphQLString },
            title: { type: graphQL.GraphQLString },
            anchorId: { type: graphQL.GraphQLString },
            taxonomy: { type: graphQL.list(graphQL.GraphQLString) },
            area: { type: graphQL.list(graphQL.GraphQLString) },
            illustration: { type: graphQL.reference('Content') },
        },
    };

    return {
        types: {
            [FORM_DETAILS_LIST_TYPE]: formDetailsListType,
        },
        creationCallbacks: {
            [typeName]: (params) => {
                params.addFields({
                    formDetailsList: {
                        type: graphQL.list(graphQL.reference(FORM_DETAILS_LIST_TYPE)),
                    },
                });
            },
        },
        resolvers: {
            [FORM_DETAILS_LIST_TYPE]: <Record<string, FieldResolver>>{
                illustration: (env) => {
                    const { illustration } = env.source;
                    return illustration ? contentLib.get({ key: illustration }) : illustration;
                },
            },
            [typeName]: <Record<string, FieldResolver>>{
                formDetailsList: () => {
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
            },
        },
    };
};
