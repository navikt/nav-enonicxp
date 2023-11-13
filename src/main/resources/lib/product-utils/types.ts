import { Content } from '/lib/xp/content';
import { contentTypesInOverviewPages } from '../contenttype-lists';
import { Overview } from 'site/content-types/overview/overview';
import { ContentDescriptor } from '../../types/content-types/content-config';

const contentTypesWithProductDetailsSet: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesInOverviewPages
);

export type OverviewPageProductLink = {
    url: string;
    type: ContentTypeWithProductDetails;
    language: string;
    title: string;
};

// TODO: remove this once the frontend has been updated for the new type
type ProductItemTempFields = {
    path: string;
    _id: string;
    type: string;
    sortTitle: string;
    language: string;
};

export type OverviewPageProductItem = {
    anchorId?: string;
    productDetailsPath?: string;
    audience: string;
    title: string;
    ingress: string;
    illustration: string;
    productLinks: OverviewPageProductLink[];
} & ProductItemTempFields;

export type DetailedOverviewType = Exclude<Overview['overviewType'], 'all_products'>;

export type ContentTypeWithProductDetails = (typeof contentTypesInOverviewPages)[number];

export const isContentWithProductDetails = (
    content: Content
): content is Content<ContentTypeWithProductDetails> => {
    return contentTypesWithProductDetailsSet.has(content.type);
};
