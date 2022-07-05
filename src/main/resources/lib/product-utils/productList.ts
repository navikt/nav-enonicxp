import contentLib, { Content } from '/lib/xp/content';
import { forceArray, removeDuplicates } from '../utils/nav-utils';
import { getProductIllustrationIcons } from './productListHelpers';
import { logger } from '../utils/logging';
import { Overview } from '../../site/content-types/overview/overview';
import {
    ContentTypeWithProductDetails,
    isContentWithProductDetails,
    OverviewPageProductData,
    DetailedOverviewType,
} from './types';
import { ProductData } from '../../site/mixins/product-data/product-data';
import { appDescriptor } from '../constants';
import { Audience } from '../../site/mixins/audience/audience';
import { contentTypesWithProductDetails } from '../contenttype-lists';

type OverviewType = Overview['overviewType'];
type ProductAudience = Audience['audience'];
type ContentWithProductDetails = Content<ContentTypeWithProductDetails>;
type ContentWithProductDetailsData = ContentWithProductDetails['data'] & ProductData;
type ProductDetailsContent = Content<'no.nav.navno:product-details'>;

const sortByTitle = (a: OverviewPageProductData, b: OverviewPageProductData) =>
    a.sortTitle.localeCompare(b.sortTitle);

const getProductDetails = (
    product: Content,
    overviewType: DetailedOverviewType,
    language: string
): ProductDetailsContent | null => {
    // Generated type definitions are incorrect due to nested mixins
    const data = product.data as ContentWithProductDetailsData;

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

    if (productDetails.language === language) {
        return productDetails;
    }

    // If the product details are not in the requested language, try to find the correct language content
    // from the alternative language references of the product details content
    const productDetailsWithLanguage = forceArray(productDetails.data.languages)
        .map((contentRef) => contentLib.get({ key: contentRef }))
        .find((languageContent) => languageContent?.language === language);

    if (
        !productDetailsWithLanguage ||
        productDetailsWithLanguage.type !== 'no.nav.navno:product-details'
    ) {
        logger.warning(
            `Missing product details for content ${product._id} with language ${language}`
        );
        return null;
    }

    return productDetailsWithLanguage;
};

const productDataForAllProducts = (product: ContentWithProductDetails) => {
    const icons = getProductIllustrationIcons(product);

    // Generated type definitions are incorrect due to nested mixins
    const data = product.data as ContentWithProductDetailsData;

    const fullTitle = data.title || product.displayName;

    return {
        _id: product._id,
        path: product._path,
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

const productDataForDetailedOverview = (
    product: ContentWithProductDetails,
    overviewType: DetailedOverviewType,
    language: string
) => {
    const commonData = productDataForAllProducts(product);

    const productDetails = getProductDetails(product, overviewType, language);
    if (!productDetails) {
        return null;
    }

    return {
        ...commonData,
        sortTitle:
            productDetails.language !== product.language
                ? productDetails.displayName
                : commonData.sortTitle,
        productDetailsPath: productDetails._path,
    };
};

const buildProductData = (
    productPageContent: ContentWithProductDetails,
    overviewType: OverviewType,
    language: string
): OverviewPageProductData | null => {
    if (!isContentWithProductDetails(productPageContent)) {
        return null;
    }

    // The "all products" type only links to relevant product pages, and does not include product details
    if (overviewType === 'all_products') {
        return productDataForAllProducts(productPageContent);
    }

    return productDataForDetailedOverview(productPageContent, overviewType, language);
};

const contentTypesInAllProductsList = [
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:guide-page`,
] as const;

const getProductPages = (
    language: string,
    overviewType: OverviewType,
    audience: ProductAudience = 'person'
) => {
    return contentLib.query({
        start: 0,
        count: 1000,
        contentTypes:
            overviewType === 'all_products'
                ? contentTypesInAllProductsList
                : contentTypesWithProductDetails,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'language',
                            values: [language],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data.audience',
                            values: [audience],
                        },
                    },
                ],
            },
        },
    }).hits;
};

const getProductDataFromProductPages = (
    productPages: ContentWithProductDetails[],
    overviewType: OverviewType,
    language: string
): OverviewPageProductData[] => {
    return productPages.reduce((acc, content) => {
        const productData = buildProductData(content, overviewType, language);
        if (!productData) {
            return acc;
        }

        return [...acc, productData];
    }, [] as OverviewPageProductData[]);
};

const getLocalizedProductData = (
    norwegianPages: ContentWithProductDetails[],
    language: string,
    overviewType: OverviewType
) => {
    const { norwegianOnlyPages, localizedPages } = norwegianPages.reduce(
        (acc, content) => {
            // If the norwegian content has no alternative language versions, we must
            // use the norwegian page to find product details
            if (!content.data.languages) {
                acc.norwegianOnlyPages.push(content);
                return acc;
            }

            let localizedContent: ContentWithProductDetails | undefined;

            forceArray(content.data.languages).some((contentId) => {
                const content = contentLib.get({ key: contentId });
                if (content?.language === language && isContentWithProductDetails(content)) {
                    localizedContent = content;
                    return true;
                }
                return false;
            });

            // If there is a localized version of the product page in the language we want
            // we can get product data directly from here. Otherwise we will have to go
            // via the norwegian page
            if (localizedContent) {
                acc.localizedPages.push(localizedContent);
            } else {
                acc.norwegianOnlyPages.push(content);
            }

            return acc;
        },
        { norwegianOnlyPages: [], localizedPages: [] } as {
            norwegianOnlyPages: ContentWithProductDetails[];
            localizedPages: ContentWithProductDetails[];
        }
    );

    const productDataFromLocalizedPages = getProductDataFromProductPages(
        localizedPages,
        overviewType,
        language
    );

    const productDataFromNorwegianPages = getProductDataFromProductPages(
        norwegianOnlyPages,
        overviewType,
        language
    ).filter(
        (fromNorwegian) =>
            !productDataFromLocalizedPages.some(
                (fromLocalized) =>
                    fromLocalized.productDetailsPath === fromNorwegian.productDetailsPath
            )
    );

    return [
        ...productDataFromLocalizedPages,
        // Remove duplicates, as some product details are used on multiple pages
        ...removeDuplicates(
            productDataFromNorwegianPages,
            (a, b) => a.productDetailsPath === b.productDetailsPath
        ),
    ];
};

export const getProductDataForOverview = (
    language: string,
    overviewType: OverviewType,
    audience: Audience['audience'] = 'person'
) => {
    // We use the norwegian pages as a baseline, then look for alternative language versions
    // of the attached norwegian product details for other languages
    const norwegianProductPages = getProductPages('no', overviewType, audience);

    if (language === 'no') {
        return getProductDataFromProductPages(norwegianProductPages, overviewType, language).sort(
            sortByTitle
        );
    }

    return getLocalizedProductData(norwegianProductPages, language, overviewType).sort(sortByTitle);
};
