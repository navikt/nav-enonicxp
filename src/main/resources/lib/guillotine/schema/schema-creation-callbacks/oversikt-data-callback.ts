import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { buildFormDetailsList } from '../../../overview-pages/oversikt-v3/form-details-utils';
import {
    OutboundLinks,
    OversiktListItem,
    SimpleDetail,
} from '../../../overview-pages/oversikt-v3/types';
import { buildProductDetailsList } from '../../../overview-pages/oversikt-v3/product-details-utils';
import { buildBasicServicesList } from '../../../overview-pages/oversikt-v3/basic-services-utils';

const buildItemList = (content: contentLib.Content<'no.nav.navno:oversikt'>) => {
    if (
        content.data.oversiktType === 'application' ||
        content.data.oversiktType === 'addendum' ||
        content.data.oversiktType === 'complaint'
    ) {
        return buildFormDetailsList(content);
    } else if (
        content.data.oversiktType === 'rates' ||
        content.data.oversiktType === 'payout_dates' ||
        content.data.oversiktType === 'processing_times'
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
            ingress: { type: graphQlLib.GraphQLString },
            formNumbers: { type: graphQlLib.GraphQLString },
        },
    });

    const OutboundLinksSchema = graphQlCreateObjectType<keyof OutboundLinks>(context, {
        name: context.uniqueName('OutboundLinks'),
        description: 'Outbound links to external resources',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            language: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
        },
    });

    const ItemListSchema = graphQlCreateObjectType<keyof OversiktListItem>(context, {
        name: context.uniqueName('oversiktListItem'),
        description:
            'Liste over sider med produktdetaljer, skjemadetaljer eller grunnleggende oversikt over tjenester',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            detailsPath: { type: graphQlLib.GraphQLString },
            audience: { type: graphQlLib.GraphQLString },
            subItems: {
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
            productLinks: {
                type: graphQlLib.list(OutboundLinksSchema),
            },
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
