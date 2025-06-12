import { Content } from '/lib/xp/content';
import { contentTypesWithFormDetails, contentTypesWithTaxonomy } from '../../contenttype-lists';

type ContentTypeWithFormDetails = (typeof contentTypesWithFormDetails)[number];
type ContentTypeWithTaxonomy = (typeof contentTypesWithTaxonomy)[number];

export type ContentWithFormDetails = Content<ContentTypeWithFormDetails>;
export type ContentWithTaxonomy = Content<ContentTypeWithTaxonomy>;

export type ProductDataInFormsOverviewItem = Pick<
    ContentWithFormDetails['data'],
    'title' | 'sortTitle' | 'illustration' | 'area' | 'ingress'
>;

export type Taxonomy = Pick<ContentWithTaxonomy['data'], 'taxonomy'> | null;

export type FormDetailsMap = Record<string, Content<'no.nav.navno:form-details'>>;

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
