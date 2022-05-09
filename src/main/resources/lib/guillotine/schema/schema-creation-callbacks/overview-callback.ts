import { CreationCallback } from '../../utils/creation-callback-utils';

// const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql.js');

const { getAllProducts } = require('../../../productList/productList');

export const overviewCallback: CreationCallback = (context, params) => {
    const xpImage = graphQlLib.createObjectType(context, {
        name: context.uniqueName('xpImage'),
        description: 'xpImage',
        fields: {
            _type: { type: graphQlLib.GraphQLString },
            mediaUrl: { type: graphQlLib.GraphQLString },
        },
    });

    const icon = graphQlLib.createObjectType(context, {
        name: context.uniqueName('Icon'),
        description: 'Icon',
        fields: {
            icon: { type: xpImage },
        },
    });

    const icons = graphQlLib.createObjectType(context, {
        name: context.uniqueName('Icons'),
        description: 'Icons',
        fields: {
            icons: { type: graphQlLib.list(icon) },
        },
    });

    const illustration = graphQlLib.createObjectType(context, {
        name: context.uniqueName('Illustration'),
        description: 'Illustration',
        fields: {
            data: { type: icons },
        },
    });

    const productType = graphQlLib.createObjectType(context, {
        name: context.uniqueName('ProductType'),
        description: 'Produkttype',
        fields: {
            _id: { type: graphQlLib.GraphQLString },
            path: { type: graphQlLib.GraphQLString },
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
