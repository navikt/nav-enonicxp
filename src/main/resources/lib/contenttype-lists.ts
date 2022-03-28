import { ContentDescriptor } from '../types/content-types/content-config';
import { appDescriptor } from './constants';

type ContentTypeList = ContentDescriptor[];

type ContentTypeSet = { [type in ContentDescriptor]?: true };

const listToSet = (list: ContentTypeList): ContentTypeSet =>
    list.reduce((acc, contentType) => {
        return { ...acc, [contentType]: true };
    }, {});

export const legacyPageContentTypes: ContentTypeList = [
    `${appDescriptor}:main-article`,
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

export const productCardTargetTypes: ContentTypeSet = listToSet([...productPageContentTypes]);

export const typesWithDeepReferences: ContentTypeSet = listToSet([
    'portal:fragment',
    `${appDescriptor}:global-value-set`,
    `${appDescriptor}:notification`,
    `${appDescriptor}:main-article-chapter`,
    `${appDescriptor}:content-list`,
]);

export const contentTypesWithBreadcrumbs: ContentTypeSet = listToSet([
    ...dynamicPageContentTypes,
    `${appDescriptor}:main-article`,
    `${appDescriptor}:section-page`,
    `${appDescriptor}:page-list`,
    `${appDescriptor}:transport-page`,
    `${appDescriptor}:large-table`,
]);

export const contentTypesRenderedByFrontend: ContentTypeList = [
    ...legacyPageContentTypes,
    ...dynamicPageContentTypes,
    ...linkContentTypes,
    `${appDescriptor}:main-article-chapter`,
    `${appDescriptor}:url`,
];
