import contentLib from '/lib/xp/content';
import { forceArray } from '../utils/nav-utils';
import { getProductIllustrationIcons } from './productListHelpers';
import { ContentDescriptor } from 'types/content-types/content-config';
import { logger } from '../utils/logging';

const batchCount = 1000;

const includedContentTypes = ['content-page-with-sidemenus', 'guide-page'].map(
    (contentType) => `${app.name}:${contentType}`
) as ContentDescriptor[];

const cleanProduct = (product: any) => {
    const icons = getProductIllustrationIcons(product);

    const productDetailsPaths = contentLib
        .query({
            count: 100,
            contentTypes: ['no.nav.navno:product-details'],
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'data.pageUsageReference',
                            values: [product._id],
                        },
                    },
                },
            },
        })
        .hits.map((hit) => hit._path);

    log.info(`Hits for ${product._path}: ${JSON.stringify(productDetailsPaths)}`);

    if (productDetailsPaths.length === 0) {
        return null;
    }

    // TODO: handle this (preferably prevent the possibility)
    if (productDetailsPaths.length > 1) {
        logger.critical(`Found more than 1 entry for product details!`);
    }

    return {
        idOrPath: product.data.customPath || product._path,
        productDetailsPath: productDetailsPaths[0],
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

const getAllProducts = (language = 'no') => {
    const entriesBatch = contentLib
        .query({
            start: 0,
            count: batchCount,
            contentTypes: includedContentTypes,
        })
        .hits.map(cleanProduct)
        .filter((product) => product && product.language === language && !!product.title)
        .sort((a, b) => a?.title.localeCompare(b?.title));
    return entriesBatch;
};

export { getAllProducts };
