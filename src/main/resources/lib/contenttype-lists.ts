import { appDescriptor } from './constants';

export const legacyPageContentTypes = [
    `${appDescriptor}:main-article`,
    `${appDescriptor}:main-article-chapter`,
    `${appDescriptor}:section-page`,
    `${appDescriptor}:page-list`,
    `${appDescriptor}:transport-page`,
    `${appDescriptor}:large-table`,
    `${appDescriptor}:office-information`,
    `${appDescriptor}:publishing-calendar`,
] as const;

export const productPageContentTypes = [
    `${appDescriptor}:situation-page`,
    `${appDescriptor}:guide-page`,
    `${appDescriptor}:themed-article-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:tools-page`,
] as const;

export const dynamicPageContentTypes = [
    ...productPageContentTypes,
    `${appDescriptor}:dynamic-page`,
] as const;

export const linkContentTypes = [
    `${appDescriptor}:internal-link`,
    `${appDescriptor}:external-link`,
    `${appDescriptor}:url`,
] as const;

export const contentTypesInSitemap = [
    ...dynamicPageContentTypes,
    ...legacyPageContentTypes,
] as const;

export const contentTypesInDataQuery = [
    ...contentTypesInSitemap,
    'media:text',
    'media:document',
    'media:spreadsheet',
    'media:presentation',
] as const;

export const contentTypesInContentSwitcher = [
    ...dynamicPageContentTypes,
    ...legacyPageContentTypes,
    ...linkContentTypes,
] as const;

export const typesWithDeepReferences = [
    'portal:fragment',
    `${appDescriptor}:global-value-set`,
    `${appDescriptor}:notification`,
    `${appDescriptor}:main-article-chapter`,
    `${appDescriptor}:content-list`,
] as const;

export const contentTypesWithBreadcrumbs = [
    ...dynamicPageContentTypes,
    `${appDescriptor}:main-article`,
    `${appDescriptor}:main-article-chapter`,
    `${appDescriptor}:section-page`,
    `${appDescriptor}:page-list`,
    `${appDescriptor}:transport-page`,
    `${appDescriptor}:large-table`,
    `${appDescriptor}:office-information`,
    `${appDescriptor}:publishing-calendar`,
] as const;

export const contentTypesRenderedByPublicFrontend = [
    ...legacyPageContentTypes,
    ...dynamicPageContentTypes,
    ...linkContentTypes,
] as const;

export const contentTypesRenderedByEditorFrontend = [
    ...contentTypesRenderedByPublicFrontend,
    `${appDescriptor}:global-value-set`,
    `${appDescriptor}:contact-information`,
] as const;
