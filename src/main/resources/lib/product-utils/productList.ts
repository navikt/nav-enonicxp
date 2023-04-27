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
import { APP_DESCRIPTOR, CONTENT_LOCALE_DEFAULT } from '../constants';
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

const sortFunc = (a: OverviewPageProductData, b: OverviewPageProductData) =>
    a.sortTitle.localeCompare(b.sortTitle);

const getProductDetails = (
    product: ContentWithProductDetails,
    overviewType: DetailedOverviewType
): ProductDetailsContent | null => {
    const detailsContentId = (product.data as ContentWithProductDetailsData)[overviewType];
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
    productPageContent: ContentWithProductDetails,
    overviewType: DetailedOverviewType,
    requestedLanguage: string
) => {
    const productDetailsContent = getProductDetails(productPageContent, overviewType);
    if (!productDetailsContent) {
        return null;
    }

    const languageFromContext = getLocaleFromContext();

    // Ensure content in non-default languages in the default project repo are not included
    // This check can be removed after all product details have been migrated to layers
    if (
        productDetailsContent.language !== requestedLanguage &&
        languageFromContext === CONTENT_LOCALE_DEFAULT
    ) {
        return null;
    }

    const commonData = buildCommonProductData(productPageContent);

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
        productDetailsPath: getPublicPath(productDetailsContent, languageFromContext),
    };
};

const getProductPages = (
    overviewType: OverviewType,
    audience: ProductAudience[],
    language?: string
) => {
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
                    ...(language
                        ? [
                              {
                                  hasValue: {
                                      field: 'language',
                                      values: [language],
                                  },
                              },
                          ]
                        : []),
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

const getAllProductsData = (audience: ProductAudience[], language: string) => {
    return getProductPages('all_products', audience, language)
        .map(buildCommonProductData)
        .sort(sortFunc);
};

export const getProductDataForOverviewPage = (
    language: string,
    overviewType: OverviewType,
    audience: ProductAudience[]
) => {
    if (overviewType === 'all_products') {
        return getAllProductsData(audience, language);
    }

    const productDataList = getProductPages(overviewType, audience)
        .reduce<OverviewPageProductData[]>((acc, content) => {
            const productData = buildDetailedProductData(content, overviewType, language);
            if (productData) {
                acc.push(productData);
            }

            return acc;
        }, [])
        .sort(sortFunc);

    return removeDuplicates(
        productDataList,
        (a, b) => a.sortTitle === b.sortTitle && a.productDetailsPath === b.productDetailsPath
    );
};
