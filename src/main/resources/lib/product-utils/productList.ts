import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { logger } from '../utils/logging';
import { Overview } from '../../site/content-types/overview/overview';
import {
    ContentTypeWithProductDetails,
    DetailedOverviewType,
    OverviewPageProductData,
} from './types';
import { ProductData } from '../../site/mixins/product-data/product-data';
import { APP_DESCRIPTOR } from '../constants';
import { Audience } from '../../site/mixins/audience/audience';
import { contentTypesWithProductDetails } from '../contenttype-lists';
import { getPublicPath } from '../paths/public-path';
import { getLocaleFromContext } from '../localization/locale-context';
import { removeDuplicates } from '../utils/array-utils';

type OverviewType = Overview['overviewType'];
type ProductAudience = Audience['audience'];
type ContentWithProductDetails = Content<ContentTypeWithProductDetails>;
// Generated data type definitions are incorrect due to nested mixins
type ContentWithProductDetailsData = ContentWithProductDetails['data'] & ProductData;
type ProductDetailsContent = Content<'no.nav.navno:product-details'>;

const contentTypesInAllProductsList = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:guide-page`,
] as const;

const getProductDetails = (
    product: ContentWithProductDetails,
    overviewType: DetailedOverviewType
): ProductDetailsContent | null => {
    const data = product.data as ContentWithProductDetailsData;

    const detailsContentId = data[overviewType];
    if (!detailsContentId) {
        return null;
    }

    const productDetails = contentLib.get({ key: detailsContentId });
    if (!productDetails || productDetails.type !== 'no.nav.navno:product-details') {
        logger.error(
            `Product details with id ${detailsContentId} and type ${overviewType} 
            not found for content id ${product._id}`,
            true,
            true
        );
        return null;
    }

    return productDetails;
};

const buildCommonProductData = (product: ContentWithProductDetails) => {
    const data = product.data as ContentWithProductDetailsData;
    const fullTitle = data.title || product.displayName;

    return {
        ...data,
        _id: product._id,
        type: product.type,
        path: product._path,
        language: product.language,
        title: fullTitle,
        sortTitle: data.sortTitle || fullTitle,
    };
};

const buildDetailedProductData = (
    productContent: ContentWithProductDetails,
    overviewType: DetailedOverviewType
) => {
    const productDetails = getProductDetails(productContent, overviewType);
    if (!productDetails) {
        return null;
    }

    const commonData = buildCommonProductData(productContent);

    // If the product details are in a different language from the product page
    // we use the name of the product details as the displayed/sorted title
    const sortTitle =
        productDetails.language !== productContent.language
            ? productDetails.displayName
            : commonData.sortTitle;

    return {
        ...commonData,
        sortTitle,
        anchorId: sanitize(sortTitle),
        productDetailsPath: getPublicPath(productDetails, getLocaleFromContext()),
    };
};

const getProductPagesForOverview = (overviewType: OverviewType, audience: ProductAudience[]) => {
    const isAllProductsType = overviewType === 'all_products';

    return contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: isAllProductsType
            ? contentTypesInAllProductsList
            : contentTypesWithProductDetails,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.audience',
                            values: audience,
                        },
                    },
                    ...(!isAllProductsType
                        ? [
                              {
                                  exists: {
                                      field: `data.${overviewType}`,
                                  },
                              },
                          ]
                        : []),
                ],
                mustNot: [
                    {
                        hasValue: {
                            field: 'x.no-nav-navno.previewOnly.previewOnly',
                            values: [true],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data.hideFromProductlist',
                            values: [true],
                        },
                    },
                ],
            },
        },
    }).hits;
};

export const getProductDataForOverviewPage = (
    language: string,
    overviewType: OverviewType,
    audience: ProductAudience[]
) => {
    const productPages = getProductPagesForOverview(overviewType, audience);

    const productTransformFunc =
        overviewType === 'all_products'
            ? buildCommonProductData
            : (productPageContent: ContentWithProductDetails) =>
                  buildDetailedProductData(productPageContent, overviewType);

    const productDataList = productPages
        .reduce<OverviewPageProductData[]>((acc, content) => {
            const productData = productTransformFunc(content);
            if (productData) {
                acc.push(productData);
            }

            return acc;
        }, [])
        .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));

    if (overviewType === 'all_products') {
        return productDataList;
    }

    return removeDuplicates(
        productDataList,
        (a, b) => a.sortTitle === b.sortTitle && a.productDetailsPath === b.productDetailsPath
    );
};
