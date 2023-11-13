import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { logger } from '../utils/logging';
import { Overview } from '../../site/content-types/overview/overview';
import {
    ContentTypeWithProductDetails,
    DetailedOverviewType,
    OverviewPageProductItem,
} from './types';
import { APP_DESCRIPTOR } from '../constants';
import { Audience as _Audience } from '../../site/mixins/audience/audience';
import { contentTypesInOverviewPages } from '../contenttype-lists';
import { getPublicPath } from '../paths/public-path';
import { runInContext } from '../context/run-in-context';

type OverviewType = Overview['overviewType'];
type Audience = _Audience['audience']['_selected'];

type ContentWithProductDetails = Content<ContentTypeWithProductDetails>;
// Generated data type definitions are incorrect due to nested mixins
type ProductDetailsContent = Content<'no.nav.navno:product-details'>;

const CONTENT_TYPES_IN_ALL_PRODUCTS_LISTS = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:guide-page`,
] as const;

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

const getDataFromProductPage = (product: ContentWithProductDetails): OverviewPageProductItem => {
    const { type, data, language, displayName } = product;
    const { illustration, title, audience, sortTitle, ingress } = data;

    const pageTitle = title || displayName;
    const listItemTitle = sortTitle || pageTitle;

    const path = getPublicPath(product, language);

    const dataForBackwardsCompatibility = {
        _id: product._id,
        language: product.language,
        type: product.type,
        path,
        sortTitle: listItemTitle,
    };

    return {
        ...dataForBackwardsCompatibility,
        title: listItemTitle,
        ingress,
        audience: audience._selected,
        illustration,
        anchorId: sanitize(listItemTitle),
        productLinks: [
            {
                url: path,
                language,
                type,
                title: pageTitle,
            },
        ],
    };
};

const getProductPages = (overviewType: OverviewType, audience: Audience[]) => {
    const isAllProductsType = overviewType === 'all_products';

    return contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: isAllProductsType
            ? CONTENT_TYPES_IN_ALL_PRODUCTS_LISTS
            : contentTypesInOverviewPages,
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

const getAllProductsData = (audience: Audience[]) => {
    return getProductPages('all_products', audience).map(getDataFromProductPage);
};

const getTypeSpecificProductsData = (
    overviewType: DetailedOverviewType,
    audience: Audience[],
    requestedLanguage: string
) => {
    const productPages = getProductPages(overviewType, audience);

    // Keep track of which product details have been added, to ensure we do not get unwanted dupes
    const productDetailsAdded = new Set<string>();

    // The rule here is that we want every product detail in the requested language included in the
    // final list, at least once. Each detail can be included multiple times, but only if they are
    // used on multiple product pages in the requested language.
    const productDataMap = productPages.reduce<Record<string, OverviewPageProductItem>>(
        (acc, productPageContent) => {
            const productDetailsContent = getProductDetails(productPageContent, overviewType);
            if (!productDetailsContent || productDetailsContent.language !== requestedLanguage) {
                return acc;
            }

            const { _id: productDetailsId } = productDetailsContent;
            const { _id: productPageId } = productPageContent;

            const isProductPageInRequestedLanguage =
                productPageContent.language === requestedLanguage;

            const productPageData = getDataFromProductPage(productPageContent);

            // We do not want the possibility of duplicate product details, unless they belong to
            // product pages in the requested language
            if (!isProductPageInRequestedLanguage && productDetailsAdded.has(productDetailsId)) {
                // Add another product link, to ensure all relevant products are linked from the product details
                // when the product pages themselves aren't localized
                acc[productDetailsId].productLinks.push(...productPageData.productLinks);
                return acc;
            }

            productDetailsAdded.add(productDetailsId);

            // If the product is not in the requested language, we use the name of the product details
            // as the displayed/sorted title
            const title = isProductPageInRequestedLanguage
                ? productPageData.title
                : productDetailsContent.displayName;

            const productData: OverviewPageProductItem = {
                ...productPageData,
                title,
                productDetailsPath: getPublicPath(productDetailsContent, requestedLanguage),
            };

            if (isProductPageInRequestedLanguage) {
                acc[productPageId] = productData;
                // Delete the data keyed with the product details own id, in case it was previously added
                delete acc[productDetailsId];
            } else {
                acc[productDetailsId] = productData;
            }

            return acc;
        },
        {}
    );

    return Object.values(productDataMap);
};

export const buildOverviewPageProductList = (
    overviewType: OverviewType,
    audience: Audience[],
    language: string
) => {
    const productData = runInContext({ branch: 'master' }, () =>
        overviewType === 'all_products'
            ? getAllProductsData(audience)
            : getTypeSpecificProductsData(overviewType, audience, language)
    );

    return productData.sort((a, b) => a.title.localeCompare(b.title));
};
