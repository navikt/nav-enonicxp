import contentLib from '/lib/xp/content';
import { forceArray } from '../utils/nav-utils';
import { getProductIllustrationIcons } from './productListHelpers';
import { logger } from '../utils/logging';
import { Overview } from '../../site/content-types/overview/overview';
import { contentTypesWithOverviewPages } from '../contenttype-lists';

const cleanProduct = (product: any, overviewType: Overview['overviewType']) => {
    const icons = getProductIllustrationIcons(product);

    const productDetailsPaths = contentLib
        .query({
            count: 100,
            contentTypes: ['no.nav.navno:product-details'],
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'data.pageUsageReference',
                                values: [product._id],
                            },
                        },
                        {
                            hasValue: {
                                field: 'data.detailType',
                                values: [overviewType],
                            },
                        },
                    ],
                },
            },
        })
        .hits.map((hit) => hit._path);

    if (productDetailsPaths.length === 0) {
        return null;
    }

    // TODO: handle this (preferably prevent the possibility)
    if (productDetailsPaths.length > 1) {
        logger.warning(`Found more than 1 entry for product details!`);
    }

    return {
        _id: product._id,
        productDetailsPath: productDetailsPaths[0],
        title: product.data.title || product.displayName,
        ingress: product.data.ingress,
        audience: product.data.audience,
        language: product.language,
        taxonomy: forceArray(product.data.taxonomy),
        area: product.data.area,
        page: product.page,
        illustration: {
            data: {
                icons,
            },
        },
    };
};

export const getAllProducts = (language: string, overviewType: Overview['overviewType']) => {
    const products = contentLib
        .query({
            start: 0,
            count: 1000,
            contentTypes: contentTypesWithOverviewPages,
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'language',
                            values: [language],
                        },
                    },
                },
            },
        })
        .hits.map((product) => cleanProduct(product, overviewType))
        .filter(Boolean)
        .sort((a, b) => a?.title.localeCompare(b?.title));

    return products;
};
