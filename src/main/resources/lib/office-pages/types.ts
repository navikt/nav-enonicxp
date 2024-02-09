import { Content } from '/lib/xp/content';
import { ContentDescriptor } from '../../types/content-types/content-config';

export type OfficeContent = Content<(typeof OFFICE_PAGE_TYPES)[number]>;

const OFFICE_PAGE_TYPES: ReadonlyArray<ContentDescriptor> = [
    'no.nav.navno:office-branch',
    'no.nav.navno:office-information',
] as const;

export const isOfficeContent = (content: Content): content is OfficeContent =>
    OFFICE_PAGE_TYPES.includes(content.type);
