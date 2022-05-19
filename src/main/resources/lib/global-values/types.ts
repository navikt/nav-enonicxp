import { Content } from '/lib/xp/content';
import { GlobalNumberValueItem } from '../../types/content-types/global-value-set';
import { CaseTimeItem, CaseTimeUnit } from '../../types/content-types/global-case-time-set';
import { ContentDescriptor } from '../../types/content-types/content-config';

export type GlobalValueContentDescriptor =
    | 'no.nav.navno:global-value-set'
    | 'no.nav.navno:global-case-time-set';

export type GlobalValueContentTypes =
    | Content<'no.nav.navno:global-value-set'>
    | Content<'no.nav.navno:global-case-time-set'>;

export type GlobalValueItem = GlobalNumberValueItem | CaseTimeItem;

const globalValueContentTypesSet: { [key in ContentDescriptor]?: true } = {
    'no.nav.navno:global-value-set': true,
    'no.nav.navno:global-case-time-set': true,
};

export const isGlobalValueSetType = (content: Content): content is GlobalValueContentTypes =>
    !!globalValueContentTypesSet[content.type];

export const validCaseTimeUnits: { [key in CaseTimeUnit]: true } = {
    days: true,
    weeks: true,
    months: true,
};
