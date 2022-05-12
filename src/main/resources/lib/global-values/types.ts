import { Content } from '/lib/xp/content';
import { GlobalNumberValueItem } from '../../types/content-types/global-value-set';
import { CaseProcessingTimeItem } from '../../types/content-types/case-processing-time-set';

export type GlobalValueContentTypes =
    | Content<'no.nav.navno:global-value-set'>
    | Content<'no.nav.navno:case-processing-time-set'>;

export type GlobalValueItem = GlobalNumberValueItem | CaseProcessingTimeItem;
