import contentLib, { Content } from '/lib/xp/content';
import { forceArray, removeDuplicates } from '../utils/nav-utils';
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
import { Audience } from '../../site/mixins/audience/audience';

const getProductDetails = (
    product: Content,
    overviewType: ProductDetailsType,
    language: string
) => {
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

    if (productDetails.language === language) {
        return productDetails;
    }

    // If the product details are not in the requested language, try to find the correct language content
    // from the alternative language references
    const productDetailsWithLanguage = forceArray(productDetails.data.languages)
        .map((contentRef) => contentLib.get({ key: contentRef }))
        .find((languageContent) => languageContent?.language === language);

    if (!productDetailsWithLanguage) {
        logger.error(
            `Missing product details for content ${product._id} with language ${language}`
        );
    }

    return productDetailsWithLanguage;
};

const buildSimpleBaseProduct = (product: Content<ContentTypeWithProductDetails>) => {
    const icons = getProductIllustrationIcons(product);

    // Generated type definitions are incorrect due to nested mixins
    const data = product.data as Content<ContentTypeWithProductDetails>['data'] & ProductData;

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

const buildProductData = (
    product: Content,
    overviewType: Overview['overviewType'],
    language: string
): OverviewPageProductData | null => {
    if (!isContentWithProductDetails(product)) {
        return null;
    }

    if (overviewType === 'all_products') {
        return buildSimpleBaseProduct(product);
    }

    const productDetails = getProductDetails(product, overviewType, language);

    if (!productDetails) {
        return null;
    }

    const simpleBaseProduct = buildSimpleBaseProduct(product);

    return {
        ...simpleBaseProduct,
        productDetailsPath: productDetails._path,
    };
};

const getProductPages = (
    language: string,
    overviewType: Overview['overviewType'],
    audience: Audience['audience'] = 'person'
) => {
    return contentLib.query({
        start: 0,
        count: 1000,
        contentTypes:
            overviewType === 'all_products'
                ? [`${appDescriptor}:content-page-with-sidemenus`, `${appDescriptor}:guide-page`]
                : [
                      `${appDescriptor}:content-page-with-sidemenus`,
                      `${appDescriptor}:guide-page`,
                      `${appDescriptor}:themed-article-page`,
                  ],
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

export const getAllProducts = (
    language: string,
    overviewType: Overview['overviewType'],
    audience: Audience['audience'] = 'person'
) => {
    // We use the norwegian pages as a baseline, then look for alternative language versions
    // of the attached norwegian product details for other languages
    const norwegianProductPages = getProductPages('no', overviewType, audience);

    const allProducts = norwegianProductPages
        .reduce((acc, content) => {
            const productData = buildProductData(content, overviewType, language);
            if (!productData) {
                return acc;
            }

            return [...acc, productData];
        }, [] as OverviewPageProductData[])
        .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));

    if (language === 'no') {
        return allProducts;
    }

    const { norwegianOnlyPages, localizedPages } = norwegianProductPages.reduce(
        (acc, content) => {
            if (!content.data.languages) {
                acc.norwegianOnlyPages.push(content);
                return acc;
            }

            const localizedContent = forceArray(content.data.languages).find((contentId) => {
                const content = contentLib.get({ key: contentId });
                if (content?.language === language) {
                }
            });

            return acc;
        },
        { norwegianOnlyPages: [], localizedPages: [] } as {
            norwegianOnlyPages: Content[];
            localizedPages: Content[];
        }
    );

    return [];
};
