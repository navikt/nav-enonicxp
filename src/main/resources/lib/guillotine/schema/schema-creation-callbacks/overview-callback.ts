import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { getProductDataForOverviewPage } from '../../../product-utils/productList';
import { logger } from '../../../utils/logging';
import {
    OverviewPageIllustrationIcon,
    OverviewPageProductData,
} from '../../../product-utils/types';
import { forceArray } from '../../../utils/nav-utils';

export const overviewCallback: CreationCallback = (context, params) => {
    const xpImage = graphQlCreateObjectType<keyof OverviewPageIllustrationIcon['icon']>(context, {
        name: context.uniqueName('xpImage'),
        description: 'xpImage',
        fields: {
            __typename: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            mediaUrl: { type: graphQlLib.GraphQLString },
        },
    });

    const icon = graphQlCreateObjectType(context, {
        name: context.uniqueName('Icon'),
        description: 'Icon',
        fields: {
            icon: { type: xpImage },
        },
    });

    const icons = graphQlCreateObjectType(context, {
        name: context.uniqueName('Icons'),
        description: 'Icons',
        fields: {
            icons: { type: graphQlLib.list(icon) },
        },
    });

    const illustration = graphQlCreateObjectType(context, {
        name: context.uniqueName('Illustration'),
        description: 'Illustration',
        fields: {
            data: { type: icons },
        },
    });

    const productType = graphQlCreateObjectType<keyof OverviewPageProductData>(context, {
        name: context.uniqueName('ProductType'),
        description: 'Produkttype',
        fields: {
            _id: { type: graphQlLib.GraphQLID },
            anchorId: { type: graphQlLib.GraphQLID },
            type: { type: graphQlLib.GraphQLString },
            path: { type: graphQlLib.GraphQLString },
            productDetailsPath: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            sortTitle: { type: graphQlLib.GraphQLString },
            language: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            audience: { type: graphQlLib.GraphQLString },
            taxonomy: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            area: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            illustration: { type: illustration },
        },
    });

    params.fields.productList = {
        args: { contentId: graphQlLib.GraphQLID },
        type: graphQlLib.list(productType),
        resolve: (env) => {
            const { contentId } = env.args;
            if (!contentId) {
                logger.error('No contentId provided for overview-page resolver');
                return [];
            }

            const content = contentLib.get({ key: contentId });
            if (content?.type !== 'no.nav.navno:overview') {
                logger.error(`Content not found for overview page id ${contentId}`);
                return [];
            }

            const { language, data } = content;
            const { overviewType, audience } = data;

            if (!overviewType) {
                logger.error(`Type not set for overview page id ${contentId}`);
                return [];
            }

            if (!audience) {
                logger.error(`Audience not set for overview page id ${contentId}`);
                return [];
            }

            const productList = getProductDataForOverviewPage(
                language || 'no',
                overviewType,
                forceArray(audience)
            );
            return productList;
        },
    };
};
