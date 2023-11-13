import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { buildOverviewPageProductList } from '../../../product-utils/productList';
import { logger } from '../../../utils/logging';
import { OverviewPageProductItem, OverviewPageProductLink } from '../../../product-utils/types';
import { forceArray } from '../../../utils/array-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';

export const overviewDataCallback: CreationCallback = (context, params) => {
    const productLinkType = graphQlCreateObjectType<keyof OverviewPageProductLink>(context, {
        name: context.uniqueName('OverviewProductLink'),
        description: 'Product link',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            language: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
        },
    });

    const productListItemType = graphQlCreateObjectType<keyof OverviewPageProductItem>(context, {
        name: context.uniqueName('OverviewListItem'),
        description: 'Product item in overview list',
        fields: {
            productLinks: { type: graphQlLib.list(productLinkType) },
            anchorId: { type: graphQlLib.GraphQLString },
            productDetailsPath: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            audience: { type: graphQlLib.GraphQLString },
            taxonomy: {
                type: graphQlLib.list(graphQlLib.GraphQLString),
                resolve: (env) => forceArray(env.source.taxonomy),
            },
            area: {
                type: graphQlLib.list(graphQlLib.GraphQLString),
                resolve: (env) => forceArray(env.source.area),
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

    params.fields.productList = {
        type: graphQlLib.list(productListItemType),
        resolve: () => {
            const contentId = getGuillotineContentQueryBaseContentId();
            if (!contentId) {
                logger.error('No contentId provided for overview-page resolver');
                return [];
            }

            const content = contentLib.get({ key: contentId });
            if (content?.type !== 'no.nav.navno:overview') {
                logger.error(`Content not found for overview page id ${contentId}`);
                return [];
            }

            const { data, language } = content;
            const { overviewType, audience } = data;

            if (!overviewType) {
                logger.error(`Type not set for overview page id ${contentId}`);
                return [];
            }

            if (!audience) {
                logger.error(`Audience not set for overview page id ${contentId}`);
                return [];
            }

            return buildOverviewPageProductList(overviewType, forceArray(audience), language);
        },
    };
};
