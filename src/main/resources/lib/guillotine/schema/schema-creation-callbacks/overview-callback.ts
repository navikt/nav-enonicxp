import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';

import graphQlLib from '/lib/graphql';

import { getAllProducts } from '../../../productList/productList';

export const overviewCallback: CreationCallback = (context, params) => {
    const xpImage = graphQlCreateObjectType(context, {
        name: context.uniqueName('xpImage'),
        description: 'xpImage',
        fields: {
            __typename: { type: graphQlLib.GraphQLString },
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
        },
    });

    params.fields.productList = {
        type: graphQlLib.list(productType),
        resolve: () => {
            const productList = getAllProducts('no');
            return productList;
        },
    };
};
