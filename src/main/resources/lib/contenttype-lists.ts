import { appDescriptor } from './constants';
import { ContentDescriptor } from '../types/content-types/content-config';

type ContentTypeList = ContentDescriptor[];

export const legacyPageContentTypes: ContentTypeList = [
    `${appDescriptor}:main-article`,
    `${appDescriptor}:main-article-chapter`,
    `${appDescriptor}:section-page`,
    `${appDescriptor}:page-list`,
    `${appDescriptor}:transport-page`,
    `${appDescriptor}:large-table`,
    `${appDescriptor}:office-information`,
    `${appDescriptor}:publishing-calendar`,
    `${appDescriptor}:melding`,
];

export const productCardPartContentTypes: ContentTypeList = [
    `${appDescriptor}:situation-page`,
    `${appDescriptor}:guide-page`,
    `${appDescriptor}:themed-article-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:tools-page`,
    `${appDescriptor}:overview`,
    `${appDescriptor}:generic-page`,
    `${appDescriptor}:current-topic-page`,
];

export const dynamicPageContentTypes: ContentTypeList = [
    `${appDescriptor}:situation-page`,
    `${appDescriptor}:guide-page`,
    `${appDescriptor}:themed-article-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:tools-page`,
    `${appDescriptor}:dynamic-page`,
    `${appDescriptor}:generic-page`,
    `${appDescriptor}:overview`,
    `${appDescriptor}:front-page`,
    `${appDescriptor}:current-topic-page`,
    `${appDescriptor}:area-page`,
];

export const linkContentTypes: ContentTypeList = [
    `${appDescriptor}:internal-link`,
    `${appDescriptor}:external-link`,
    `${appDescriptor}:url`,
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
    `${appDescriptor}:redirects-folder`,
];

export const typesWithDeepReferences: ContentTypeList = [
    'portal:fragment',
    `${appDescriptor}:content-list`,
    `${appDescriptor}:global-value-set`,
    `${appDescriptor}:global-case-time-set`,
    `${appDescriptor}:product-details`,
    `${appDescriptor}:payout-dates`,
];

export const contentTypesWithBreadcrumbs: ContentTypeList = [
    `${appDescriptor}:situation-page`,
    `${appDescriptor}:guide-page`,
    `${appDescriptor}:themed-article-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:tools-page`,
    `${appDescriptor}:overview`,
    `${appDescriptor}:dynamic-page`,
    `${appDescriptor}:generic-page`,
    `${appDescriptor}:overview`,
    `${appDescriptor}:main-article`,
    `${appDescriptor}:main-article-chapter`,
    `${appDescriptor}:section-page`,
    `${appDescriptor}:page-list`,
    `${appDescriptor}:transport-page`,
    `${appDescriptor}:large-table`,
    `${appDescriptor}:office-information`,
    `${appDescriptor}:publishing-calendar`,
];

export const contentTypesWithComponents: ContentTypeList = [
    ...dynamicPageContentTypes,
    `${appDescriptor}:product-details`,
    'portal:page-template',
];

export const contentTypesWithProductDetails = [
    `${appDescriptor}:guide-page`,
    `${appDescriptor}:themed-article-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
] as const;

export const contentTypesRenderedByPublicFrontend: ContentTypeList = [
    ...legacyPageContentTypes,
    ...dynamicPageContentTypes,
    ...linkContentTypes,
];

export const contentTypesRenderedByEditorFrontend: ContentTypeList = [
    ...contentTypesRenderedByPublicFrontend,
    `${appDescriptor}:global-value-set`,
    `${appDescriptor}:global-case-time-set`,
    `${appDescriptor}:contact-information`,
    `${appDescriptor}:product-details`,
    `${appDescriptor}:office-branch`,
    `${appDescriptor}:payout-dates`,
    `${appDescriptor}:office-editorial-page`,
    `${appDescriptor}:publishing-calendar-entry`,
    'portal:page-template',
    'portal:fragment',
    'portal:site',
];
