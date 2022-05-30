import contentLib from '/lib/xp/content';
import { forceArray } from '../utils/nav-utils';
import { getProductIllustrationIcons } from './productListHelpers';
import { logger } from '../utils/logging';
import { Overview } from '../../site/content-types/overview/overview';
import { contentTypesWithOverviewPages } from '../contenttype-lists';
import { ProductData } from '../../site/mixins/product-data/product-data';
import { PortalComponent } from '../../types/components/component-portal';
import { MediaDescriptor } from '../../types/content-types/content-config';

export type OverviewPageIllustrationIcon = {
    icon: {
        __typename: MediaDescriptor;
        mediaUrl: string;
    };
};

export type OverviewPageProductData = {
    _id: string;
    productDetailsPath: string;
    title: string;
    ingress: string;
    audience: ProductData['audience'];
    language: string;
    taxonomy: ProductData['taxonomy'];
    area: ProductData['area'];
    page: PortalComponent<'page'>;
    illustration: {
        data: {
            icons: OverviewPageIllustrationIcon[];
        };
    };
};

const cleanProduct = (
    product: any,
    overviewType: Overview['overviewType']
): OverviewPageProductData | null => {
    const detailsContentId = product.data[overviewType];
    if (!detailsContentId) {
        logger.info(`No product details set for content ${product._id} with type ${overviewType}`);
        return null;
    }

    const productDetails = contentLib.get({ key: detailsContentId });
    if (!productDetails) {
        logger.info(
            `Product details with id ${detailsContentId} and type ${overviewType} not found for content id ${product._id}`
        );
        return null;
    }

    const icons = getProductIllustrationIcons(product);

    return {
        _id: product._id,
        productDetailsPath: productDetails._path,
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
    const products = contentLib.query({
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
