import { ContentPageWithSidemenus } from '../../site/content-types/content-page-with-sidemenus/content-page-with-sidemenus';
import { Content } from '/lib/xp/content';
import { FormDetailsSelector } from '../../site/mixins/form-details-selector/form-details-selector';
import { contentTypesWithFormDetails } from '../contenttype-lists';

type ContentTypeWithFormDetails = (typeof contentTypesWithFormDetails)[number];

type ProductData = ContentPageWithSidemenus;

type IncludedProductData = Pick<
    ProductData,
    'title' | 'sortTitle' | 'illustration' | 'area' | 'taxonomy' | 'ingress'
>;

export type FormDetailsMap = Record<string, Content<'no.nav.navno:form-details'>>;

export type ContentWithFormDetails = Content<ContentTypeWithFormDetails> & {
    // Fields from nested mixins are not included in the autogenerate types
    data: IncludedProductData &
        Pick<ProductData, 'externalProductUrl'> &
        Required<Pick<FormDetailsSelector, 'formDetailsTargets'>> & {
            keywords?: string | string[];
        };
};

export type FormDetailsListItem = {
    anchorId: string;
    formDetailsPaths: string[];
    formDetailsTitles: string[];
    formDetailsIngresses: string[];
    formNumbers: string[];
    keywords: string[];
    url: string | null;
    type: ContentTypeWithFormDetails;
} & Required<IncludedProductData>;
