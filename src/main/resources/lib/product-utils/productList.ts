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

const contentTypesInAllProductsList = [
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:guide-page`,
] as const;

const sortByTitle = (a: OverviewPageProductData, b: OverviewPageProductData) =>
    a.sortTitle.localeCompare(b.sortTitle);

const getProductDetails = (
    product: Content,
    overviewType: DetailedOverviewType,
    language: string
): ProductDetailsContent | null => {
    // Generated data type definitions are incorrect due to nested mixins
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

    // If the product details on the product page are not in the requested language, try to find the correct localized
    // content from the alternative language references of the product details
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
        // If the product details are in a different language from the product page
        // we use the name of the product details as the displayed/sorted title
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

// When putting together product data for alternative languages, we first get product data from any fully localized
// product poges in that language, and fall back to localized standalone product details for everything else.
// If neither a product page nor product details exists for the requested language, that product will not be included
const getLocalizedProductData = (
    norwegianProductPages: ContentWithProductDetails[],
    language: string,
    overviewType: OverviewType
) => {
    const norwegianOnlyProductPages: ContentWithProductDetails[] = [];
    const localizedProductPages: ContentWithProductDetails[] = [];

    norwegianProductPages.forEach((content) => {
        if (!content.data.languages) {
            norwegianOnlyProductPages.push(content);
            return;
        }

        // If there is a localized version of the product page in the language we want
        // we can get product data directly from there.
        const foundLocalized = forceArray(content.data.languages).some((contentId) => {
            const content = contentLib.get({ key: contentId });
            if (content?.language === language && isContentWithProductDetails(content)) {
                localizedProductPages.push(content);
                return true;
            }
            return false;
        });

        // Else we will have to go via the norwegian page
        if (!foundLocalized) {
            norwegianOnlyProductPages.push(content);
        }
    });

    // Get product data from fully localized product pages when they exist
    const productDataFromLocalizedPages = getProductDataFromProductPages(
        localizedProductPages,
        overviewType,
        language
    );

    // If the norwegian page has no alternative language versions, we go via the product
    // details on the norwegian page to find localized product details
    const productDataFromNorwegianPages = getProductDataFromProductPages(
        norwegianOnlyProductPages,
        overviewType,
        language
    )
        // Don't include product data which already is included in a localized pages
        .filter(
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

export const getProductDataForOverviewPage = (
    language: string,
    overviewType: OverviewType,
    audience: ProductAudience = 'person'
) => {
    const norwegianProductPages = getProductPages('no', overviewType, audience);

    const productData =
        language === 'no'
            ? getProductDataFromProductPages(norwegianProductPages, overviewType, language)
            : getLocalizedProductData(norwegianProductPages, language, overviewType);

    return productData.sort(sortByTitle);
};
