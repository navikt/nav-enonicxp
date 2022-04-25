// const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql.js');

const { getProductList } = require('../../../overview/overview');

/*
id: product._id,
path: product._path,
title: product.data.title || product.displayName,
ingress: product.data.ingress,
illustration: getProductIllustrationIcon(product),
taxonomy: navUtils.forceArray(product.data.taxonomy),
area: product.data.area,
situationPages: getProductSituationPages(product),
*/

const overviewCallback = (context, params) => {
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

    const situationPage = graphQlLib.createObjectType(context, {
        name: context.uniqueName('SituationPageType'),
        description: 'Situasjonsside',
        fields: {
            path: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
        },
    });

    const productType = graphQlLib.createObjectType(context, {
        name: context.uniqueName('ProductType'),
        description: 'Produkttype',
        fields: {
            id: { type: graphQlLib.GraphQLString },
            path: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            language: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            audience: { type: graphQlLib.GraphQLString },
            taxonomy: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            area: { type: graphQlLib.GraphQLString },
            illustration: { type: illustration },
            situationPages: { type: graphQlLib.list(situationPage) },
        },
    });

    params.fields.productList = {
        type: graphQlLib.list(productType),
        resolve: () => {
            const productList = getProductList('no');
            return productList;
        },
    };
};

module.exports = { overviewCallback };
