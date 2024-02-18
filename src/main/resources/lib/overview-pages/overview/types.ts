import { Content } from '/lib/xp/content';
import { contentTypesInOverviewPages } from '../../contenttype-lists';
import { Overview } from '../../../site/content-types/overview/overview';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { Taxonomy } from '../../../site/mixins/taxonomy/taxonomy';
import { Area } from '../../../site/mixins/area/area';
import { ThemedArticlePage } from '../../../site/content-types/themed-article-page/themed-article-page';
import { ArrayOrSingle } from '../../../types/util-types';

const contentTypesWithProductDetailsSet: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesInOverviewPages
);

type OverviewItemTaxonomy = Taxonomy['taxonomy'] | ThemedArticlePage['taxonomy'];

export type OverviewPageProductLink = {
    url: string;
    type: ContentTypeWithProductDetails;
    language: string;
    title: string;
};

export type OverviewPageProductItem = {
    anchorId?: string;
    productDetailsPath?: string;
    audience: string;
    title: string;
    ingress: string;
    illustration: string;
    productLinks: OverviewPageProductLink[];
    taxonomy?: OverviewItemTaxonomy;
    area: Area['area'];
    keywords?: ArrayOrSingle<string>;
};

export type DetailedOverviewType = Exclude<Overview['overviewType'], 'all_products'>;

export type ContentTypeWithProductDetails = (typeof contentTypesInOverviewPages)[number];

// Generated data type definitions are incorrect due to a bug with nested mixins
export type ContentWithProductDetails = Content<ContentTypeWithProductDetails> & {
    data: { keywords?: ArrayOrSingle<string> };
};

export const isContentWithProductDetails = (
    content: Content
): content is Content<ContentTypeWithProductDetails> => {
    return contentTypesWithProductDetailsSet.has(content.type);
};
