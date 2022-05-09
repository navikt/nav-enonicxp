import contentLib from '/lib/xp/content';
import { forceArray } from '../utils/nav-utils';

import { getProductIllustrationIcons } from './productListHelpers';
import { ContentDescriptor } from 'types/content-types/content-config';

const batchCount = 1000;

const includedContentTypes = ['content-page-with-sidemenus'].map(
    (contentType) => `${app.name}:${contentType}`
) as ContentDescriptor[];

const cleanProduct = (product: any) => {
    const icons = getProductIllustrationIcons(product);

    return {
        _id: product._id,
        path: product._path,
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

const getAllProducts = (start = 0) => {
    const entriesBatch = contentLib
        .query({
            start,
            count: batchCount,
            contentTypes: includedContentTypes,
        })
        .hits.map(cleanProduct);
    return entriesBatch;
};

export { getAllProducts };
