import { Content } from '/lib/xp/content';
import {
    contentTypesWithFormDetails,
    contentTypesWithProductDetails,
} from '../../contenttype-lists';
import { Oversikt } from '@xp-types/site/content-types';
import { Area } from '@xp-types/site/mixins/area';
import { ArrayOrSingle } from '../../../types/util-types';
import { ContentWithTaxonomy } from '../forms-overview-v2/types';

type ContentTypeWithFormDetails = (typeof contentTypesWithFormDetails)[number];
type ContentTypeWithProductDetails = (typeof contentTypesWithProductDetails)[number];

export type ContentWithFormDetails = Content<ContentTypeWithFormDetails>;
export type ContentWithProductDetails = Content<ContentTypeWithProductDetails>;

export type ProductDataInFormsOverviewItem = Pick<
    ContentWithFormDetails['data'],
    'title' | 'sortTitle' | 'illustration' | 'area' | 'ingress'
>;

// Generated data type definitions are incorrect due to a bug with nested mixins
export type ContentInOverviewPages = Content<
    ContentTypeWithFormDetails | ContentTypeWithProductDetails
> & {
    data: { keywords?: ArrayOrSingle<string> };
};
export type Taxonomy = Pick<ContentWithTaxonomy['data'], 'taxonomy'> | null;
export type FormDetailsMap = Record<string, Content<'no.nav.navno:form-details'>>;

export type SimpleProductDetail = {
    path: string;
    type: ContentTypeWithProductDetails;
    language: string;
    title: string;
    ingress: string;
};

export type SimpleFormDetail = {
    path: string;
    type: ContentTypeWithFormDetails;
    language: string;
    title: string;
    ingress: string;
    formNumbers: string[];
};

export type OutboundLinks = {
    url: string;
    type: ContentTypeWithFormDetails | ContentTypeWithProductDetails;
    language: string;
    title: string;
};

export type SimpleDetail = Partial<SimpleProductDetail | SimpleFormDetail>;

export type OversiktListItem = {
    url: string | null;
    anchorId?: string;
    title: string;
    sortTitle: string;
    taxonomy?: Taxonomy;
    audience: string;
    targetLanguage: string;
    area: Area['area'];
    keywords?: ArrayOrSingle<string>;
    productLinks?: OutboundLinks[];
    type: ContentTypeWithFormDetails | ContentTypeWithProductDetails;
    ingress: string;
    illustration: string;
    subItems: SimpleDetail[];
};

export type OversiktPageDetailedType = Exclude<Oversikt['oversiktType'], 'all_products'>;
