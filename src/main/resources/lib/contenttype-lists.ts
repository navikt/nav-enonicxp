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

export const productPageContentTypes: ContentTypeList = [
    `${appDescriptor}:situation-page`,
    `${appDescriptor}:guide-page`,
    `${appDescriptor}:themed-article-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:tools-page`,
];

export const dynamicPageContentTypes: ContentTypeList = [
    ...productPageContentTypes,
    `${appDescriptor}:dynamic-page`,
    `${appDescriptor}:overview`,
    `${appDescriptor}:generic-page`,
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
    ...dynamicPageContentTypes,
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

export const contentTypesWithProductDetails: ContentTypeList = [
    `${appDescriptor}:guide-page`,
    `${appDescriptor}:themed-article-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
];

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
    `${appDescriptor}:generic-page`,
    `${appDescriptor}:product-details`,
    `${appDescriptor}:payout-dates`,
    'portal:page-template',
    'portal:fragment',
];
