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

const getTypeSpecificProductData = (
    overviewType: Exclude<OverviewType, 'all_products'>,
    audience: Audience[],
    requestedLanguage: string
) => {
    const productPages = getProductPages(overviewType, audience);

    // Keep track of which product details have been added. Some product details may be added
    // multiple times to the final list, if they are used on multiple product pages.
    //
    const productDetailsAdded = new Set<string>();

    const productDataMap = productPages.reduce<Record<string, OverviewPageProductData>>(
        (acc, productPageContent) => {
            const productDetailsContent = getProductDetails(productPageContent, overviewType);
            if (!productDetailsContent || productDetailsContent.language !== requestedLanguage) {
                return acc;
            }

            const { _id: productDetailsId } = productDetailsContent;
            const { _id: productPageId } = productPageContent;

            const productPageLanguageIsRequestedLanguage =
                productPageContent.language !== requestedLanguage;

            // If the product details have already been added, we don't want to do anything if
            // the product page is not in the requested language. We only want duplicate product
            // details if they belong to multiple product pages.
            if (
                !productPageLanguageIsRequestedLanguage &&
                productDetailsAdded.has(productDetailsId)
            ) {
                return acc;
            }

            productDetailsAdded.add(productDetailsId);

            const commonData = buildCommonProductData(productPageContent);

            // If the product details are in a different language from the product page
            // we use the name of the product details as the displayed/sorted title
            const sortTitle = productPageLanguageIsRequestedLanguage
                ? commonData.sortTitle
                : productDetailsContent.displayName;

            const productData = {
                ...commonData,
                sortTitle,
                anchorId: sanitize(sortTitle),
                productDetailsPath: getPublicPath(productDetailsContent, requestedLanguage),
            };

            if (productPageLanguageIsRequestedLanguage) {
                acc[productPageId] = productData;
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

const getAllProductData = (audience: Audience[]) => {
    return getProductPages('all_products', audience).map(buildCommonProductData);
};

export const getProductDataForOverviewPage = (
    overviewType: OverviewType,
    audience: Audience[],
    language: string
) => {
    const productDataList = runInContext({ branch: 'master' }, () => {
        if (overviewType === 'all_products') {
            return getAllProductData(audience);
        }

        return getTypeSpecificProductData(overviewType, audience, language);
    });

    return productDataList.sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));
};
