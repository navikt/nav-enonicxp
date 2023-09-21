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
import { APP_DESCRIPTOR } from '../constants';
import { Audience as _Audience } from '../../site/mixins/audience/audience';
import { contentTypesWithProductDetails } from '../contenttype-lists';
import { getPublicPath } from '../paths/public-path';
import { getLocaleFromContext } from '../localization/locale-context';
import { runInContext } from '../context/run-in-context';

type OverviewType = Overview['overviewType'];
type Audience = _Audience['audience']['_selected'];

type ContentWithProductDetails = Content<ContentTypeWithProductDetails>;
// Generated data type definitions are incorrect due to nested mixins
type ProductDetailsContent = Content<'no.nav.navno:product-details'>;

const CONTENT_TYPES_IN_PRODUCT_LISTS = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:guide-page`,
] as const;

const sortFunc = (a: OverviewPageProductData, b: OverviewPageProductData) =>
    a.sortTitle.localeCompare(b.sortTitle);

const getProductDetails = (
    productPageContent: ContentWithProductDetails,
    overviewType: DetailedOverviewType
): ProductDetailsContent | null => {
    const productDetailsId = productPageContent.data[overviewType];
    if (!productDetailsId) {
        return null;
    }

    const productDetails = contentLib.get({ key: productDetailsId });
    if (!productDetails || productDetails.type !== 'no.nav.navno:product-details') {
        logger.error(
            `Product details with id ${productDetailsId} and type ${overviewType} 
            not found for content id ${productPageContent._id}`,
            true,
            true
        );
        return null;
    }

    return productDetails;
};

const buildCommonProductData = (product: ContentWithProductDetails) => {
    const data = product.data;
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
    productPageContent: ContentWithProductDetails,
    overviewType: DetailedOverviewType
) => {
    const productDetailsContent = getProductDetails(productPageContent, overviewType);
    if (!productDetailsContent) {
        return null;
    }

    const commonData = buildCommonProductData(productPageContent);
    const localeContext = getLocaleFromContext();

    // If the product details are in a different language from the product page
    // we use the name of the product details as the displayed/sorted title
    const sortTitle =
        productDetailsContent.language !== productPageContent.language
            ? productDetailsContent.displayName
            : commonData.sortTitle;

    return {
        ...commonData,
        sortTitle,
        anchorId: sanitize(sortTitle),
        productDetailsPath: getPublicPath(productDetailsContent, localeContext),
    };
};

const getProductPages = (overviewType: OverviewType, audience: Audience[]) => {
    const isAllProductsType = overviewType === 'all_products';

    return contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: isAllProductsType
            ? CONTENT_TYPES_IN_PRODUCT_LISTS
            : contentTypesWithProductDetails,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.audience._selected',
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

const getProductListData = (overviewType: OverviewType, audience: Audience[]) => {
    if (overviewType === 'all_products') {
        return getProductPages('all_products', audience).map(buildCommonProductData);
    }

    return getProductPages(overviewType, audience).reduce<OverviewPageProductData[]>(
        (acc, content) => {
            const productData = buildDetailedProductData(content, overviewType);
            if (productData) {
                acc.push(productData);
            }

            return acc;
        },
        []
    );
};

export const getProductDataForOverviewPage = (overviewType: OverviewType, audience: Audience[]) => {
    return runInContext({ branch: 'master' }, () =>
        getProductListData(overviewType, audience).sort(sortFunc)
    );
};
