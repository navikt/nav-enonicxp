import { Content } from '/lib/xp/content';
import { ProductData } from '../../site/mixins/product-data/product-data';
import {
    contentTypesWithProductDetails,
    contentTypesWithProductDetails as _contentTypesWithProductDetails,
} from '../contenttype-lists';
import { Overview } from 'site/content-types/overview/overview';
import { stringArrayToSet } from '../utils/array-utils';

const contentTypeWithProductDetails = stringArrayToSet(_contentTypesWithProductDetails);

export type OverviewPageProductData = {
    _id: string;
    type: ContentTypeWithProductDetails;
    anchorId?: string;
    productDetailsPath?: string;
    path: string;
    language: string;
} & Required<Pick<ProductData, 'title' | 'ingress' | 'audience' | 'sortTitle' | 'illustration'>>;

export type DetailedOverviewType = Exclude<Overview['overviewType'], 'all_products'>;

export type ContentTypeWithProductDetails = (typeof contentTypesWithProductDetails)[number];

export const isContentWithProductDetails = (
    content: Content
): content is Content<ContentTypeWithProductDetails> => {
    return contentTypeWithProductDetails[content.type];
};
