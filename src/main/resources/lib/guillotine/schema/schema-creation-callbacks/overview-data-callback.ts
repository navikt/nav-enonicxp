import * as contentLib from '/lib/xp/content';
import {
    FieldResolver,
    ObjectTypeDefinition,
    SchemaExtension,
} from '../../utils/creation-callback-utils';
import { buildOverviewList } from '../../../overview-pages/overview-v1/build-overview-list';
import { logger } from '../../../utils/logging';
import {
    OverviewPageItem,
    OverviewPageItemProductLink,
} from '../../../overview-pages/overview-v1/types';
import { forceArray } from '../../../utils/array-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';

const PRODUCT_LINK_TYPE = 'OverviewProductLink';
const PRODUCT_LIST_ITEM_TYPE = 'OverviewListItem';

export const overviewDataCallback: SchemaExtension = (graphQL, typeName) => {
    const productLinkType: ObjectTypeDefinition<keyof OverviewPageItemProductLink> = {
        description: 'Product link',
        fields: {
            url: { type: graphQL.GraphQLString },
            type: { type: graphQL.GraphQLString },
            language: { type: graphQL.GraphQLString },
            title: { type: graphQL.GraphQLString },
        },
    };

    const productListItemType: ObjectTypeDefinition<keyof OverviewPageItem> = {
        description: 'Product item in overview list',
        fields: {
            anchorId: { type: graphQL.GraphQLString },
            productDetailsPath: { type: graphQL.GraphQLString },
            audience: { type: graphQL.GraphQLString },
            title: { type: graphQL.GraphQLString },
            ingress: { type: graphQL.GraphQLString },
            illustration: { type: graphQL.reference('Content') },
            productLinks: { type: graphQL.list(graphQL.reference(PRODUCT_LINK_TYPE)) },
            taxonomy: { type: graphQL.list(graphQL.GraphQLString) },
            area: { type: graphQL.list(graphQL.GraphQLString) },
        },
    };

    return {
        types: {
            [PRODUCT_LINK_TYPE]: productLinkType,
            [PRODUCT_LIST_ITEM_TYPE]: productListItemType,
        },
        creationCallbacks: {
            [typeName]: (params) => {
                params.addFields({
                    productList: { type: graphQL.list(graphQL.reference(PRODUCT_LIST_ITEM_TYPE)) },
                });
            },
        },
        resolvers: {
            [PRODUCT_LIST_ITEM_TYPE]: <Record<string, FieldResolver>>{
                illustration: (env) => {
                    const { illustration } = env.source;
                    return illustration ? contentLib.get({ key: illustration }) : illustration;
                },
                taxonomy: (env) => forceArray(env.source.taxonomy),
                area: (env) => forceArray(env.source.area),
            },
            [typeName]: <Record<string, FieldResolver>>{
                productList: (): OverviewPageItem[] => {
                    const contentId = getGuillotineContentQueryBaseContentId();
                    if (!contentId) {
                        logger.warning('No contentId provided for overview page resolver');
                        return [];
                    }

                    const content = contentLib.get({ key: contentId });
                    if (content?.type !== 'no.nav.navno:overview') {
                        logger.error(`Content not found for overview page id ${contentId}`);
                        return [];
                    }

                    return buildOverviewList(content);
                },
            },
        },
    };
};
