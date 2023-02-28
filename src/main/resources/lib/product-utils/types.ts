import { Content } from '/lib/xp/content';
import { MediaDescriptor } from '../../types/content-types/content-config';
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
        __typename: MediaDescriptor;
        mediaUrl: string;
    };
};

export type OverviewPageProductData = {
    _id: string;
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
