import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { ContentWithProductDetails } from './types';
import { logger } from '../../utils/logging';
import { ProductDetails } from '../../../site/content-types/product-details/product-details';

export const getProductDetailsFromContent = (
    productPageContent: ContentWithProductDetails,
    detailsType: ProductDetails['detailType']
): Content<'no.nav.navno:product-details'> | null => {
    const productDetailsId = productPageContent.data[detailsType];
    if (!productDetailsId) {
        return null;
    }

    const productDetails = contentLib.get({ key: productDetailsId });
    if (!productDetails || productDetails.type !== 'no.nav.navno:product-details') {
        logger.error(
            `Product details with id ${productDetailsId} and type ${detailsType} 
            not found for content id ${productPageContent._id}`,
            true,
            true
        );
        return null;
    }

    return productDetails;
};
