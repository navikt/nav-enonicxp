import { Content } from '/lib/xp/content';
import { GlobalNumberValueItem } from '../../types/content-types/global-value-set';
import { CaseProcessingTimeItem } from '../../types/content-types/case-processing-time-set';
import { ContentDescriptor } from '../../types/content-types/content-config';

export type GlobalValueContentDescriptor =
    | 'no.nav.navno:global-value-set'
    | 'no.nav.navno:case-processing-time-set';

export type GlobalValueContentTypes =
    | Content<'no.nav.navno:global-value-set'>
    | Content<'no.nav.navno:case-processing-time-set'>;

export type GlobalValueItem = GlobalNumberValueItem | CaseProcessingTimeItem;

const globalValueContentTypesSet: { [key in ContentDescriptor]?: true } = {
    'no.nav.navno:global-value-set': true,
    'no.nav.navno:case-processing-time-set': true,
};

export const globalValueContentTypes: GlobalValueContentDescriptor[] = [
    'no.nav.navno:global-value-set',
    'no.nav.navno:case-processing-time-set',
];

export const isGlobalValueSetType = (content: Content): content is GlobalValueContentTypes =>
    !!globalValueContentTypesSet[content.type];
