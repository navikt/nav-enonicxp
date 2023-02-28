import { Content } from '/lib/xp/content';
import { ContentDescriptor, MediaDescriptor } from '../../types/content-types/content-config';
import { ProductData } from '../../site/mixins/product-data/product-data';
import {
    contentTypesWithProductDetails,
    contentTypesWithProductDetails as _contentTypesWithProductDetails,
} from '../contenttype-lists';
import { stringArrayToSet } from '../utils/nav-utils';
import { Overview } from 'site/content-types/overview/overview';

const contentTypeWithProductDetails = stringArrayToSet(_contentTypesWithProductDetails);

export type OverviewPageIllustrationIcon = {
    icon: {
        type: MediaDescriptor;
        mediaUrl: string;
    };
};

export type OverviewPageProductData = {
    _id: string;
    type: ContentDescriptor;
    anchorId?: string;
    productDetailsPath?: string;
    path: string;
    title: string;
    sortTitle: string;
    ingress: string;
    audience: ProductData['audience'];
    language: string;
    taxonomy: ProductData['taxonomy'];
    area: ProductData['area'];
    illustration: {
        type: 'no.nav.navno:animated-icons';
        data: {
            icons: OverviewPageIllustrationIcon[];
        };
    };
};

export type DetailedOverviewType = Exclude<Overview['overviewType'], 'all_products'>;

export type ContentTypeWithProductDetails = (typeof contentTypesWithProductDetails)[number];

export const isContentWithProductDetails = (
    content: Content
): content is Content<ContentTypeWithProductDetails> => {
    return contentTypeWithProductDetails[content.type];
};
