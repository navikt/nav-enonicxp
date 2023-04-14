import { APP_DESCRIPTOR } from './constants';
import { ContentDescriptor } from '../types/content-types/content-config';

type ContentTypeList = ContentDescriptor[];

export const legacyPageContentTypes: ContentTypeList = [
    `${APP_DESCRIPTOR}:main-article`,
    `${APP_DESCRIPTOR}:main-article-chapter`,
    `${APP_DESCRIPTOR}:section-page`,
    `${APP_DESCRIPTOR}:page-list`,
    `${APP_DESCRIPTOR}:transport-page`,
    `${APP_DESCRIPTOR}:large-table`,
    `${APP_DESCRIPTOR}:office-information`,
    `${APP_DESCRIPTOR}:publishing-calendar`,
    `${APP_DESCRIPTOR}:melding`,
];

export const dynamicPageContentTypes: ContentTypeList = [
    `${APP_DESCRIPTOR}:situation-page`,
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:tools-page`,
    `${APP_DESCRIPTOR}:dynamic-page`,
    `${APP_DESCRIPTOR}:generic-page`,
    `${APP_DESCRIPTOR}:overview`,
    `${APP_DESCRIPTOR}:front-page`,
    `${APP_DESCRIPTOR}:current-topic-page`,
    `${APP_DESCRIPTOR}:area-page`,
    `${APP_DESCRIPTOR}:press-landing-page`,
];

export const linkContentTypes: ContentTypeList = [
    `${APP_DESCRIPTOR}:internal-link`,
    `${APP_DESCRIPTOR}:external-link`,
    `${APP_DESCRIPTOR}:url`,
];

export const contentTypesInSitemap: ContentTypeList = [
    ...dynamicPageContentTypes,
    ...legacyPageContentTypes,
];

export const contentTypesInDataQuery: ContentTypeList = [
    ...contentTypesInSitemap,
    'media:text',
    'media:document',
    'media:spreadsheet',
    'media:presentation',
];

export const contentTypesInContentSwitcher: ContentTypeList = [
    ...dynamicPageContentTypes,
    ...legacyPageContentTypes,
    ...linkContentTypes,
    `${APP_DESCRIPTOR}:redirects-folder`,
];

export const typesWithDeepReferences: ContentTypeList = [
    'portal:fragment',
    `${APP_DESCRIPTOR}:content-list`,
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:global-case-time-set`,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:payout-dates`,
    `${APP_DESCRIPTOR}:contact-information`,
];

export const contentTypesWithBreadcrumbs: ContentTypeList = [
    `${APP_DESCRIPTOR}:situation-page`,
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:tools-page`,
    `${APP_DESCRIPTOR}:overview`,
    `${APP_DESCRIPTOR}:dynamic-page`,
    `${APP_DESCRIPTOR}:generic-page`,
    `${APP_DESCRIPTOR}:overview`,
    `${APP_DESCRIPTOR}:main-article`,
    `${APP_DESCRIPTOR}:main-article-chapter`,
    `${APP_DESCRIPTOR}:section-page`,
    `${APP_DESCRIPTOR}:page-list`,
    `${APP_DESCRIPTOR}:transport-page`,
    `${APP_DESCRIPTOR}:large-table`,
    `${APP_DESCRIPTOR}:office-information`,
    `${APP_DESCRIPTOR}:publishing-calendar`,
];

export const contentTypesWithComponents: ContentTypeList = [
    ...dynamicPageContentTypes,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:office-branch`,
    'portal:page-template',
];

export const contentTypesWithProductDetails = [
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
] as const;

export const contentTypesRenderedByPublicFrontend: ContentTypeList = [
    ...legacyPageContentTypes,
    ...dynamicPageContentTypes,
    ...linkContentTypes,
];

export const contentTypesRenderedByEditorFrontend: ContentTypeList = [
    ...contentTypesRenderedByPublicFrontend,
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:global-case-time-set`,
    `${APP_DESCRIPTOR}:contact-information`,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:form-details`,
    `${APP_DESCRIPTOR}:office-branch`,
    `${APP_DESCRIPTOR}:payout-dates`,
    `${APP_DESCRIPTOR}:office-editorial-page`,
    `${APP_DESCRIPTOR}:publishing-calendar-entry`,
    'portal:page-template',
    'portal:fragment',
    'portal:site',
];

export const contentTypesWithCustomEditor: ContentTypeList = [
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:global-case-time-set`,
];
