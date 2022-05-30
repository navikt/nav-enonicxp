import contentLib, { Content } from '/lib/xp/content';
import { forceArray } from '../utils/nav-utils';
import { getProductIllustrationIcons } from './productListHelpers';
import { logger } from '../utils/logging';
import { Overview } from '../../site/content-types/overview/overview';
import { contentTypesWithProductDetails } from '../contenttype-lists';
import { isContentWithProductDetails, OverviewPageProductData } from './types';

const cleanProduct = (
    product: Content,
    overviewType: Overview['overviewType']
): OverviewPageProductData | null => {
    if (!isContentWithProductDetails(product)) {
        return null;
    }

    const detailsContentId = product.data[overviewType];
    if (!detailsContentId) {
        return null;
    }

    const productDetails = contentLib.get({ key: detailsContentId });
    if (!productDetails || productDetails.type !== 'no.nav.navno:product-details') {
        logger.warning(
            `Product details with id ${detailsContentId} and type ${overviewType} not found for content id ${product._id}`
        );
        return null;
    }

    const icons = getProductIllustrationIcons(product);

    // Generated type definitions are incorrect due to nested mixins
    const data = product.data as any;

    return {
        _id: product._id,
        productDetailsPath: productDetails._path,
        title: data.title || product.displayName,
        ingress: data.ingress,
        audience: data.audience,
        language: product.language || 'no',
        taxonomy: forceArray(data.taxonomy),
        area: data.area,
        illustration: {
            data: {
                icons,
            },
        },
    };
};

export const getAllProducts = (language: string, overviewType: Overview['overviewType']) => {
    const products = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: contentTypesWithProductDetails,
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
    }).hits;

    return products
        .reduce((acc, content) => {
            const productData = cleanProduct(content, overviewType);
            if (!productData) {
                return acc;
            }

            return [...acc, productData];
        }, [] as OverviewPageProductData[])
        .sort((a, b) => a?.title.localeCompare(b?.title));
};
