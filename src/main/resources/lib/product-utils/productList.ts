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
import { forceArray, removeDuplicates } from '../utils/array-utils';

type OverviewType = Overview['overviewType'];
type ProductAudience = Audience['audience']['_selected'];
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

const getProductDetailsFromLegacyLanguagesReferences = (
    productDetailsContent: ProductDetailsContent,
    requestedLanguage: string
) => {
    if (productDetailsContent.data.languages) {
        const directLookupResults = contentLib.query({
            count: 2,
            contentTypes: ['no.nav.navno:product-details'],
            sort: 'createdTime ASC',
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'language',
                                values: [requestedLanguage],
                            },
                        },
                    ],
                },
                ids: { values: forceArray(productDetailsContent.data.languages) },
            },
        }).hits;

        if (directLookupResults.length > 0) {
            if (directLookupResults.length > 1) {
                logger.error(
                    `Product details ${productDetailsContent._path} has more than one legacy languages reference for "${requestedLanguage}"`
                );
            }

            return directLookupResults[0];
        }
    }

    const reverseLookupResults = contentLib.query({
        count: 2,
        contentTypes: ['no.nav.navno:product-details'],
        sort: 'createdTime ASC',
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.languages',
                            values: [productDetailsContent._id],
                        },
                    },
                    {
                        hasValue: {
                            field: 'language',
                            values: [requestedLanguage],
                        },
                    },
                ],
            },
        },
    }).hits;

    if (reverseLookupResults.length > 1) {
        logger.error(
            `Found more than one product detail with legacy language reference to ${productDetailsContent._path} for "${requestedLanguage}"`
        );
    }

    return reverseLookupResults[0];
};

const getProductDetails = (
    productPageContent: ContentWithProductDetails,
    overviewType: DetailedOverviewType,
    requestedLanguage: string
): ProductDetailsContent | null => {
    const detailsContentId = (productPageContent.data as ContentWithProductDetailsData)[
        overviewType
    ];
    if (!detailsContentId) {
        return null;
    }

    const productDetails = contentLib.get({ key: detailsContentId });
    if (!productDetails || productDetails.type !== 'no.nav.navno:product-details') {
        logger.error(
            `Product details with id ${detailsContentId} and type ${overviewType} 
            not found for content id ${productPageContent._id}`,
            true,
            true
        );
        return null;
    }

    if (productDetails.language === requestedLanguage) {
        return productDetails;
    }

    return getProductDetailsFromLegacyLanguagesReferences(productDetails, requestedLanguage);
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
    const productDetailsContent = getProductDetails(
        productPageContent,
        overviewType,
        requestedLanguage
    );
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

const getProductPages = (
    overviewType: OverviewType,
    audience: ProductAudience[],
    languages?: string[]
) => {
    const isAllProductsType = overviewType === 'all_products';

    // Må ta høyde for at audience kan befinne seg i to forskjellige felter,
    // alt etter om siden er publisert eller ikke etter migrering til ny datamodell for audience
    // Kan fjerne dette etter at alle sider med audience er publisert
    const query = (audienceField: string) => ( contentLib.query({
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
                                field: audienceField,
                                values: audience,
                            },
                        },
                        ...(languages
                            ? [
                                {
                                    hasValue: {
                                        field: 'language',
                                        values: languages,
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
        }).hits
    );
    return (
        query('data.audience').concat(
        query('data.audience._selected'))
    );
};

const getAllProductsData = (audience: ProductAudience[], language: string) => {
    return getProductPages('all_products', audience, [language])
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

    // For languages other than the default, we also include the default pages in the query
    // as this is used as a fallback for any products that are not localized to other languages
    const productPageLanguagesToRetrieve = [language];
    if (language !== CONTENT_LOCALE_DEFAULT) {
        productPageLanguagesToRetrieve.push(CONTENT_LOCALE_DEFAULT);
    }

    const productDataList = getProductPages(overviewType, audience, productPageLanguagesToRetrieve)
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
