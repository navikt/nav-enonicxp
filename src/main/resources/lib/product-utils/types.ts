import { Content } from '/lib/xp/content';
import { MediaDescriptor } from '../../types/content-types/content-config';
import { ProductData } from '../../site/mixins/product-data/product-data';
import { contentTypesWithProductDetails as _contentTypesWithProductDetails } from '../contenttype-lists';
import { stringArrayToSet } from '../utils/nav-utils';

const contentTypeWithProductDetails = stringArrayToSet(_contentTypesWithProductDetails);

export type OverviewPageIllustrationIcon = {
    icon: {
        __typename: MediaDescriptor;
        mediaUrl: string;
    };
};

export type OverviewPageProductData = {
    _id: string;
    productDetailsPath?: string;
    title: string;
    sortTitle: string;
    ingress: string;
    audience: ProductData['audience'];
    language: string;
    taxonomy: ProductData['taxonomy'];
    area: ProductData['area'];
    illustration: {
        data: {
            icons: OverviewPageIllustrationIcon[];
        };
    };
};

export type ProductDetailsType = 'rates' | 'payout_dates' | 'processing_times';

export type ContentTypeWithProductDetails =
    | 'no.nav.navno:content-page-with-sidemenus'
    | 'no.nav.navno:guide-page'
    | 'no.nav.navno:themed-article-page';

export const isContentWithProductDetails = (
    content: Content
): content is Content<ContentTypeWithProductDetails> => {
    return contentTypeWithProductDetails[content.type];
};
