import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import {
    getAllProducts,
    OverviewPageIllustrationIcon,
    OverviewPageProductData,
} from '../../../productList/productList';
import { logger } from '../../../utils/logging';

export const overviewCallback: CreationCallback = (context, params) => {
    const xpImage = graphQlCreateObjectType(context, {
        name: context.uniqueName('xpImage'),
        description: 'xpImage',
        fields: {
            __typename: { type: graphQlLib.GraphQLString },
            mediaUrl: { type: graphQlLib.GraphQLString },
        } as Record<keyof OverviewPageIllustrationIcon['icon'], any>,
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

    const productType = graphQlCreateObjectType(context, {
        name: context.uniqueName('ProductType'),
        description: 'Produkttype',
        fields: {
            _id: { type: graphQlLib.GraphQLID },
            productDetailsPath: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            language: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            audience: { type: graphQlLib.GraphQLString },
            taxonomy: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            area: { type: graphQlLib.GraphQLString },
            illustration: { type: illustration },
        } as Record<keyof OverviewPageProductData, any>,
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
            const { overviewType } = data;

            if (!overviewType) {
                logger.error(`Type not set for overview page id ${contentId}`);
                return [];
            }

            const productList = getAllProducts(language || 'no', overviewType);
            return productList;
        },
    };
};
