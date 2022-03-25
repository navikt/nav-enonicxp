import { ContentDescriptor } from '../types/content-types/content-config';
import { appDescriptor } from './constants';

type ContentTypeSet = { [type in ContentDescriptor]?: true };

export const sitemapContentTypes: ContentDescriptor[] = [
    `${appDescriptor}:situation-page`,
    `${appDescriptor}:guide-page`,
    `${appDescriptor}:themed-article-page`,
    `${appDescriptor}:dynamic-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:main-article`,
    `${appDescriptor}:section-page`,
    `${appDescriptor}:page-list`,
    `${appDescriptor}:transport-page`,
    `${appDescriptor}:office-information`,
    `${appDescriptor}:publishing-calendar`,
    `${appDescriptor}:large-table`,
];

export const dataQueryContentTypes = [
    ...sitemapContentTypes,
    'media:text',
    'media:document',
    'media:spreadsheet',
    'media:presentation',
];

export const switchableContentTypes = [
    `${appDescriptor}:dynamic-page`,
    `${appDescriptor}:content-page-with-sidemenus`,
    `${appDescriptor}:internal-link`,
    `${appDescriptor}:external-link`,
    `${appDescriptor}:main-article`,
    `${appDescriptor}:section-page`,
    `${appDescriptor}:page-list`,
    `${appDescriptor}:transport-page`,
    `${appDescriptor}:office-information`,
    `${appDescriptor}:large-table`,
];

export const productCardTargetTypes: ContentTypeSet = {
    [`${appDescriptor}:content-page-with-sidemenus`]: true,
    [`${appDescriptor}:situation-page`]: true,
    [`${appDescriptor}:tools-page`]: true,
};

export const typesWithDeepReferences: ContentTypeSet = {
    'portal:fragment': true,
    [`${appDescriptor}:global-value-set`]: true,
    [`${appDescriptor}:notification`]: true,
    [`${appDescriptor}:main-article-chapter`]: true,
    [`${appDescriptor}:content-list`]: true,
};

export const contentTypesWithBreadcrumbs: ContentTypeSet = {
    [`${appDescriptor}:main-article`]: true,
    [`${appDescriptor}:section-page`]: true,
    [`${appDescriptor}:page-list`]: true,
    [`${appDescriptor}:transport-page`]: true,
    [`${appDescriptor}:generic-page`]: true,
    [`${appDescriptor}:dynamic-page`]: true,
    [`${appDescriptor}:content-page-with-sidemenus`]: true,
    [`${appDescriptor}:situation-page`]: true,
    [`${appDescriptor}:guide-page`]: true,
    [`${appDescriptor}:themed-article-page`]: true,
    [`${appDescriptor}:large-table`]: true,
};
