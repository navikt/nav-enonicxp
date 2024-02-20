import { Content } from '/lib/xp/content';
import { contentTypesInOverviewPages } from '../../contenttype-lists';
import { Overview } from '../../../site/content-types/overview/overview';
import { Taxonomy } from '../../../site/mixins/taxonomy/taxonomy';
import { Area } from '../../../site/mixins/area/area';
import { ThemedArticlePage } from '../../../site/content-types/themed-article-page/themed-article-page';
import { ArrayOrSingle } from '../../../types/util-types';

type OverviewItemTaxonomy = Taxonomy['taxonomy'] | ThemedArticlePage['taxonomy'];

type ContentTypesInOverviewPages = (typeof contentTypesInOverviewPages)[number];

// Generated data type definitions are incorrect due to a bug with nested mixins
export type ContentInOverviewPages = Content<ContentTypesInOverviewPages> & {
    data: { keywords?: ArrayOrSingle<string> };
};

export type OverviewPageItemProductLink = {
    url: string;
    type: ContentTypesInOverviewPages;
    language: string;
    title: string;
};

export type OverviewPageItem = {
    anchorId?: string;
    productDetailsPath?: string;
    audience: string;
    title: string;
    ingress: string;
    illustration: string;
    productLinks: OverviewPageItemProductLink[];
    taxonomy?: OverviewItemTaxonomy;
    area: Area['area'];
    keywords?: ArrayOrSingle<string>;
};

export type OverviewPageDetailedType = Exclude<Overview['overviewType'], 'all_products'>;
