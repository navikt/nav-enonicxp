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
    `${APP_DESCRIPTOR}:form-intermediate-step`,
    `${APP_DESCRIPTOR}:generic-page`,
    `${APP_DESCRIPTOR}:overview`,
    `${APP_DESCRIPTOR}:front-page`,
    `${APP_DESCRIPTOR}:front-page-nested`,
    `${APP_DESCRIPTOR}:current-topic-page`,
    `${APP_DESCRIPTOR}:area-page`,
    `${APP_DESCRIPTOR}:press-landing-page`,
    `${APP_DESCRIPTOR}:forms-overview`,
];

export const dynamicPageContentTypesV2: ContentTypeList = [
    `${APP_DESCRIPTOR}:situation-page-v2`,
    `${APP_DESCRIPTOR}:guide-page-v2`,
    `${APP_DESCRIPTOR}:themed-article-page-v2`,
    `${APP_DESCRIPTOR}:product-page-v2`,
    `${APP_DESCRIPTOR}:tools-page-v2`,
    `${APP_DESCRIPTOR}:generic-page-v2`,
    `${APP_DESCRIPTOR}:current-topic-page-v2`,
];

export const linkContentTypes: ContentTypeList = [
    `${APP_DESCRIPTOR}:internal-link`,
    `${APP_DESCRIPTOR}:external-link`,
    `${APP_DESCRIPTOR}:url`,
];

export const contentTypesInSitemap: ContentTypeList = [
    ...dynamicPageContentTypes,
    ...dynamicPageContentTypesV2,
    ...legacyPageContentTypes,
    `${APP_DESCRIPTOR}:office-branch`,
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
    ...dynamicPageContentTypesV2,
    ...legacyPageContentTypes,
    ...linkContentTypes,
    `${APP_DESCRIPTOR}:redirects-folder`,
];

export const contentTypesWithDeepReferences = [
    'portal:fragment',
    `${APP_DESCRIPTOR}:content-list`,
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:global-case-time-set`,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:payout-dates`,
    `${APP_DESCRIPTOR}:contact-information`,
] as const;

export const contentTypesWithBreadcrumbs: ContentTypeList = [
    `${APP_DESCRIPTOR}:situation-page`,
    `${APP_DESCRIPTOR}:situation-page-v2`,
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:guide-page-v2`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:themed-article-page-v2`,
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:product-page-v2`,
    `${APP_DESCRIPTOR}:tools-page`,
    `${APP_DESCRIPTOR}:tools-page-v2`,
    `${APP_DESCRIPTOR}:dynamic-page`,
    `${APP_DESCRIPTOR}:generic-page`,
    `${APP_DESCRIPTOR}:generic-page-v2`,
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
    ...dynamicPageContentTypesV2,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:office-branch`,
    'portal:page-template',
];

export const contentTypesInOverviewPages = [
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
] as const;

export const contentTypesInFormsOverviewPages = [
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
] as const;

export const contentTypesRenderedByPublicFrontend: ContentTypeList = [
    ...legacyPageContentTypes,
    ...dynamicPageContentTypes,
    ...dynamicPageContentTypesV2,
    ...linkContentTypes,
];

export const contentTypesRenderedByEditorFrontend: ContentTypeList = [
    ...contentTypesRenderedByPublicFrontend,
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:global-case-time-set`,
    `${APP_DESCRIPTOR}:contact-information`,
    `${APP_DESCRIPTOR}:calculator`,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:form-details`,
    `${APP_DESCRIPTOR}:page-meta`,
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
