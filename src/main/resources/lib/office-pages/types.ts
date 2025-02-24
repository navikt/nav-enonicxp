import { Content } from '/lib/xp/content';
import { ContentDescriptor } from '../../types/content-types/content-config';

export type OfficeContent = Content<(typeof OFFICE_PAGE_TYPES)[number]>;
export type OfficePage = Content<
    Extract<(typeof OFFICE_PAGE_TYPES)[number], 'no.nav.navno:office-page'>
>;

const OFFICE_PAGE_TYPES = [
    'no.nav.navno:office-information',
    'no.nav.navno:office-page',
] as const satisfies ReadonlyArray<ContentDescriptor>;

export const isOfficeContent = (content: Content): content is OfficeContent =>
    OFFICE_PAGE_TYPES.includes((content as OfficeContent).type);
