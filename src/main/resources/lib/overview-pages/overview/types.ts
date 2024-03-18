import { Content } from '/lib/xp/content';
import { contentTypesInOverviewPages } from '../../contenttype-lists';
import { Overview } from '@xp-types/site/content-types/overview';
import { Taxonomy } from '@xp-types/site/mixins/taxonomy';
import { Area } from '@xp-types/site/mixins/area';
import { ThemedArticlePage } from '@xp-types/site/content-types/themed-article-page';
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
