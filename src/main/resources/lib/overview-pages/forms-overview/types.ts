import { ContentPageWithSidemenus } from '@xp-types/site/content-types/content-page-with-sidemenus';
import { Content } from '/lib/xp/content';
import { contentTypesWithFormDetails } from '../../contenttype-lists';

type ContentTypeWithFormDetails = (typeof contentTypesWithFormDetails)[number];

export type ContentWithFormDetails = Content<ContentTypeWithFormDetails>;

export type ProductDataInFormsOverviewItem = Pick<
    ContentWithFormDetails['data'],
    'title' | 'sortTitle' | 'illustration' | 'area' | 'ingress'
> &
    Pick<ContentPageWithSidemenus, 'taxonomy'>;

export type FormDetailsMap = Record<string, Content<'no.nav.navno:form-details'>>;

export type FormDetailsListItem = {
    anchorId: string;
    formDetailsPaths: string[];
    formDetailsTitles: string[];
    formDetailsIngresses: string[];
    formNumbers: string[];
    keywords: string[];
    url: string | null;
    type: ContentTypeWithFormDetails;
    targetLanguage: string;
} & Required<ProductDataInFormsOverviewItem>;
