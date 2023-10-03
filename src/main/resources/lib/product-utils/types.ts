import { Content } from '/lib/xp/content';
import { contentTypesInOverviewPages } from '../contenttype-lists';
import { Overview } from 'site/content-types/overview/overview';
import { ContentPageWithSidemenus } from '../../site/content-types/content-page-with-sidemenus/content-page-with-sidemenus';
import { ContentDescriptor } from '../../types/content-types/content-config';

const contentTypesWithProductDetailsSet: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesInOverviewPages
);

export type OverviewPageProductData = {
    _id: string;
    type: ContentTypeWithProductDetails;
    anchorId?: string;
    productDetailsPath?: string;
    path: string;
    language: string;
    audience: string;
} & Required<Pick<ContentPageWithSidemenus, 'title' | 'ingress' | 'sortTitle' | 'illustration'>>;

export type DetailedOverviewType = Exclude<Overview['overviewType'], 'all_products'>;

export type ContentTypeWithProductDetails = (typeof contentTypesInOverviewPages)[number];

export const isContentWithProductDetails = (
    content: Content
): content is Content<ContentTypeWithProductDetails> => {
    return contentTypesWithProductDetailsSet.has(content.type);
};
