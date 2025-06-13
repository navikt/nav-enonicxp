import { Content } from '/lib/xp/content';
import {
    contentTypesInOverviewPages,
    contentTypesWithFormDetails,
    contentTypesWithProductDetails,
} from '../../contenttype-lists';
import { Overview } from '@xp-types/site/content-types/overview';
import { Taxonomy } from '@xp-types/site/mixins/taxonomy';
import { Area } from '@xp-types/site/mixins/area';
import { ThemedArticlePage } from '@xp-types/site/content-types/themed-article-page';
import { ArrayOrSingle } from '../../../types/util-types';

type OverviewItemTaxonomy = Taxonomy['taxonomy'] | ThemedArticlePage['taxonomy'];

type ContentTypeWithFormDetails = (typeof contentTypesWithFormDetails)[number];
type ContentTypeWithProductDetails = (typeof contentTypesWithProductDetails)[number];

export type ContentWithFormDetails = Content<ContentTypeWithFormDetails>;

export type ProductDataInFormsOverviewItem = Pick<
    ContentWithFormDetails['data'],
    'title' | 'sortTitle' | 'illustration' | 'area' | 'ingress'
>;

// Generated data type definitions are incorrect due to a bug with nested mixins
export type ContentInOverviewPages = Content<ContentTypesInOverviewPages> & {
    data: { keywords?: ArrayOrSingle<string> };
};

export type SimpleProductDetail = {
    path: string;
    type: ContentTypeWithProductDetails;
    language: string;
    title: string;
};

export type SimpleFormDetail = {
    path: string;
    type: ContentTypeWithFormDetails;
    language: string;
    title: string;
    formNumber: string;
};

export type SimpleDetail = SimpleProductDetail | SimpleFormDetail;

export type FormDetailsListItem = {
    anchorId: string;
    itemPaths: string[];
    itemTitles: string[];
    ItemIngresses: string[];
    formNumbers: string[];
    keywords: string[];
    url: string | null;
    type: ContentTypeWithFormDetails;
    targetLanguage: string;
    taxonomy: Taxonomy;
} & Required<ProductDataInFormsOverviewItem>;

export type OversiktListItem = {
    url: string;
    anchorId?: string;
    detailsPath?: string;
    audience: string;
    title: string;
    ingress: string;
    illustration: string;
    detailItems: SimpleProductDetail[];
    taxonomy?: OverviewItemTaxonomy;
    area: Area['area'];
    keywords?: ArrayOrSingle<string>;
};

export type OverviewPageDetailedType = Exclude<Overview['overviewType'], 'all_products'>;
