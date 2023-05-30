import { Content } from '/lib/xp/content';
import {
    contentTypesWithProductDetails,
    contentTypesWithProductDetails as _contentTypesWithProductDetails,
} from '../contenttype-lists';
import { Overview } from 'site/content-types/overview/overview';
import { stringArrayToSet } from '../utils/array-utils';
import { ContentPageWithSidemenus } from '../../site/content-types/content-page-with-sidemenus/content-page-with-sidemenus';

const contentTypeWithProductDetails = stringArrayToSet(_contentTypesWithProductDetails);

export type OverviewPageProductData = {
    _id: string;
    type: ContentTypeWithProductDetails;
    anchorId?: string;
    productDetailsPath?: string;
    path: string;
    language: string;
} & Required<
    Pick<ContentPageWithSidemenus, 'title' | 'ingress' | 'audience' | 'sortTitle' | 'illustration'>
>;

export type DetailedOverviewType = Exclude<Overview['overviewType'], 'all_products'>;

export type ContentTypeWithProductDetails = (typeof contentTypesWithProductDetails)[number];

export const isContentWithProductDetails = (
    content: Content
): content is Content<ContentTypeWithProductDetails> => {
    return contentTypeWithProductDetails[content.type];
};
