import contentLib, { Content } from '/lib/xp/content';
import { forceArray } from '../utils/nav-utils';
import { getProductIllustrationIcons } from './productListHelpers';
import { logger } from '../utils/logging';
import { Overview } from '../../site/content-types/overview/overview';
import { contentTypesWithProductDetails } from '../contenttype-lists';
import {
    ContentTypeWithProductDetails,
    isContentWithProductDetails,
    OverviewPageProductData,
    ProductDetailsType,
} from './types';
import { ProductData } from '../../site/mixins/product-data/product-data';
import { appDescriptor } from '../constants';
import { ContentDescriptor } from 'types/content-types/content-config';

const getProductDetails = (product: Content, overviewType: ProductDetailsType) => {
    // Generated type definitions are incorrect due to nested mixins
    const data = product.data as Content<ContentTypeWithProductDetails>['data'] & ProductData;

    const detailsContentId = data[overviewType];

    if (!detailsContentId) {
        return null;
    }

    const productDetails = contentLib.get({ key: detailsContentId });
    if (!productDetails || productDetails.type !== 'no.nav.navno:product-details') {
        logger.error(
            `Product details with id ${detailsContentId} and type ${overviewType} not found for content id ${product._id}`,
            true
        );
        return null;
    }

    return productDetails;
};

const buildSimpleBaseProduct = (product: Content<ContentTypeWithProductDetails>) => {
    const icons = getProductIllustrationIcons(product);

    // Generated type definitions are incorrect due to nested mixins
    const data = product.data as Content<ContentTypeWithProductDetails>['data'] & ProductData;

    const fullTitle = data.title || product.displayName;

    return {
        _id: product._id,
        title: fullTitle,
        sortTitle: data.sortTitle || fullTitle,
        ingress: data.ingress,
        audience: data.audience,
        language: product.language || 'no',
        taxonomy: forceArray(data.taxonomy),
        area: forceArray(data.area),
        illustration: {
            data: {
                icons,
            },
        },
    };
};

const buildProductData = (
    product: Content,
    overviewType: Overview['overviewType']
): OverviewPageProductData | null => {
    log.info(overviewType);
    if (!isContentWithProductDetails(product)) {
        return null;
    }

    if (overviewType === 'all_products') {
        return buildSimpleBaseProduct(product);
    }

    const productDetails = getProductDetails(product, overviewType);

    if (!productDetails) {
        return null;
    }

    const simpleBaseProduct = buildSimpleBaseProduct(product);

    return {
        ...simpleBaseProduct,
        productDetailsPath: productDetails._path,
    };
};

const getRelevantContentTypes = (overviewType: string): ContentDescriptor[] => {
    if (overviewType === 'product_list') {
        return [`${appDescriptor}:content-page-with-sidemenus`];
    }

    return contentTypesWithProductDetails;
};

export const getAllProducts = (language: string, overviewType: Overview['overviewType']) => {
    const products = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: getRelevantContentTypes(overviewType),
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
            const productData = buildProductData(content, overviewType);
            if (!productData) {
                return acc;
            }

            return [...acc, productData];
        }, [] as OverviewPageProductData[])
        .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));
};
