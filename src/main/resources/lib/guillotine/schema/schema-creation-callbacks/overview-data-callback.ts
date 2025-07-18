import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { buildOverviewList } from '../../../overview-pages/overview-v1/build-overview-list';
import { logger } from '../../../utils/logging';
import {
    OverviewPageItem,
    OverviewPageItemProductLink,
} from '../../../overview-pages/overview-v1/types';
import { forceArray } from '../../../utils/array-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';

export const overviewDataCallback: CreationCallback = (context, params) => {
    const productLinkType = graphQlCreateObjectType<keyof OverviewPageItemProductLink>(context, {
        name: context.uniqueName('OverviewProductLink'),
        description: 'Product link',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            language: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
        },
    });

    const productListItemType = graphQlCreateObjectType<keyof OverviewPageItem>(context, {
        name: context.uniqueName('OverviewListItem'),
        description: 'Product item in overview list',
        fields: {
            anchorId: { type: graphQlLib.GraphQLString },
            productDetailsPath: { type: graphQlLib.GraphQLString },
            audience: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            illustration: {
                type: graphQlLib.reference('Content'),
                resolve: (env) => {
                    const { illustration } = env.source;
                    return illustration ? contentLib.get({ key: illustration }) : illustration;
                },
            },
            productLinks: { type: graphQlLib.list(productLinkType) },
            taxonomy: {
                type: graphQlLib.list(graphQlLib.GraphQLString),
                resolve: (env) => forceArray(env.source.taxonomy),
            },
            area: {
                type: graphQlLib.list(graphQlLib.GraphQLString),
                resolve: (env) => forceArray(env.source.area),
            },
            keywords: {
                type: graphQlLib.list(graphQlLib.GraphQLString),
                resolve: (env) => (env.source.keywords ? forceArray(env.source.keywords) : null),
            },
        },
    });

    params.fields.productList = {
        type: graphQlLib.list(productListItemType),
        resolve: (): OverviewPageItem[] => {
            const contentId = getGuillotineContentQueryBaseContentId();
            if (!contentId) {
                logger.error('No contentId provided for overview page resolver');
                return [];
            }

            const content = contentLib.get({ key: contentId });
            if (content?.type !== 'no.nav.navno:overview') {
                logger.error(`Content not found for overview page id ${contentId}`);
                return [];
            }

            return buildOverviewList(content);
        },
    };
};
