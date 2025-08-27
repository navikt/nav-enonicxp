import * as contentLib from '/lib/xp/content';
import * as contextLib from '/lib/xp/context';
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
import { getOversiktCategory } from '../../../../lib/overview-pages/oversikt-v3/helpers';

const buildItemList = (content: contentLib.Content<'no.nav.navno:oversikt'>) => {
    if (getOversiktCategory(content.data.oversiktType) === 'formDetails') {
        return buildFormDetailsList(content);
    } else if (getOversiktCategory(content.data.oversiktType) === 'productDetails') {
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
            formNumbers: { type: graphQlLib.list(graphQlLib.GraphQLString) },
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
            audience: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            sortTitle: { type: graphQlLib.GraphQLString },
            anchorId: { type: graphQlLib.GraphQLString },
            targetLanguage: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            keywords: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            taxonomy: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            area: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            detailsPath: { type: graphQlLib.GraphQLString },
            productLinks: {
                type: graphQlLib.list(OutboundLinksSchema),
            },
            subItems: {
                type: graphQlLib.list(SimpleFormDetailSchema),
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
                const context = contextLib.get();
                logger.error(
                    `No contentId provided for overview-page resolver: ${JSON.stringify(context)}`
                );
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
