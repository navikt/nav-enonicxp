import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { buildFormDetailsList } from '../../../overview-pages/oversikt-v3/form-details-utils';
import { OversiktListItem, SimpleDetail } from '../../../overview-pages/oversikt-v3/types';

const buildItemList = (content: contentLib.Content<'no.nav.navno:oversikt'>) => {
    if (
        content.data.overviewType === 'application' ||
        content.data.overviewType === 'addendum' ||
        content.data.overviewType === 'complaint'
    ) {
        return buildFormDetailsList(content);
    } else if (
        content.data.overviewType === 'rates' ||
        content.data.overviewType === 'payout_dates' ||
        content.data.overviewType === 'processing_times'
    ) {
        return buildProductDetailsList(content);
    } else {
        return buildBasicServicesList(content);
    }
};

export const oversiktDataCallback: CreationCallback = (context, params) => {
    const SimpleFormDetailSchema = graphQlCreateObjectType<keyof SimpleDetail>(context, {
        name: context.uniqueName('SimpleFormDetail'),
        description: 'Form link',
        fields: {
            path: { type: graphQlLib.GraphQLString },
            language: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            formNumber: { type: graphQlLib.GraphQLString },
        },
    });

    const ItemListSchema = graphQlCreateObjectType<keyof OversiktListItem>(context, {
        name: context.uniqueName('oversiktListItem'),
        description:
            'Liste over sider med produktdetaljer, skjemadetaljer eller grunnleggende oversikt over tjenester',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            detailsPath: { type: graphQlLib.GraphQLString },
            audience: { type: graphQlLib.GraphQLString },
            detailItems: {
                type: graphQlLib.list(SimpleFormDetailSchema),
            },
            targetLanguage: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            keywords: { type: graphQlLib.list(graphQlLib.GraphQLString) },
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

    params.fields.itemList = {
        type: graphQlLib.list(ItemListSchema),
        resolve: () => {
            const contentId = getGuillotineContentQueryBaseContentId();
            if (!contentId) {
                logger.error('No contentId provided for overview-page resolver');
                return [];
            }

            const content = contentLib.get({ key: contentId });
            if (content?.type !== 'no.nav.navno:oversikt') {
                logger.error(`Content not found for forms overview page id ${contentId}`);
                return [];
            }

            return buildItemList(content);
        },
    };
};
