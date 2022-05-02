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
    `${appDescriptor}:global-value-set`,
    `${appDescriptor}:content-list`,
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

export const contentTypesRenderedByPublicFrontend: ContentTypeList = [
    ...legacyPageContentTypes,
    ...dynamicPageContentTypes,
    ...linkContentTypes,
];

export const contentTypesRenderedByEditorFrontend: ContentTypeList = [
    ...contentTypesRenderedByPublicFrontend,
    `${appDescriptor}:global-value-set`,
    `${appDescriptor}:contact-information`,
];
