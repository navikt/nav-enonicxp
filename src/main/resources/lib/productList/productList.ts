import contentLib from '/lib/xp/content';
import { forceArray } from '../utils/nav-utils';
import { getProductIllustrationIcons } from './productListHelpers';
import { logger } from '../utils/logging';
import { Overview } from '../../site/content-types/overview/overview';
import { contentTypesWithOverviewPages } from '../contenttype-lists';

const cleanProduct = (product: any, overviewType: Overview['overviewType']) => {
    const detailsContentId = product.data[overviewType];
    if (!detailsContentId) {
        logger.info(`No product details set for content ${product._id} with type ${overviewType}`);
        return null;
    }

    const productDetailsPath = contentLib.get({ key: detailsContentId });
    if (!productDetailsPath) {
        logger.info(
            `Product details with id ${detailsContentId} and type ${overviewType} not found for content id ${product._id}`
        );
        return null;
    }

    const icons = getProductIllustrationIcons(product);

    return {
        _id: product._id,
        productDetailsPath,
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
