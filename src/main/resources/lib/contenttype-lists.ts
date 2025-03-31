import { APP_DESCRIPTOR } from './constants';
import { ContentDescriptor } from '../types/content-types/content-config';

type ContentTypeList = ContentDescriptor[];

export const legacyPageContentTypes = [
    `${APP_DESCRIPTOR}:main-article`,
    `${APP_DESCRIPTOR}:main-article-chapter`,
    `${APP_DESCRIPTOR}:section-page`,
    `${APP_DESCRIPTOR}:page-list`,
    `${APP_DESCRIPTOR}:transport-page`,
    `${APP_DESCRIPTOR}:large-table`,
    `${APP_DESCRIPTOR}:office-information`,
    `${APP_DESCRIPTOR}:publishing-calendar`,
    `${APP_DESCRIPTOR}:melding`,
] as const satisfies ContentTypeList;

export const dynamicPageContentTypes = [
    `${APP_DESCRIPTOR}:situation-page`,
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:tools-page`,
    `${APP_DESCRIPTOR}:dynamic-page`,
    `${APP_DESCRIPTOR}:form-intermediate-step`,
    `${APP_DESCRIPTOR}:generic-page`,
    `${APP_DESCRIPTOR}:overview`,
    `${APP_DESCRIPTOR}:office-page`,
    `${APP_DESCRIPTOR}:front-page`,
    `${APP_DESCRIPTOR}:front-page-nested`,
    `${APP_DESCRIPTOR}:current-topic-page`,
    `${APP_DESCRIPTOR}:area-page`,
    `${APP_DESCRIPTOR}:press-landing-page`,
    `${APP_DESCRIPTOR}:forms-overview`,
    `${APP_DESCRIPTOR}:contact-step-page`,
] as const satisfies ContentTypeList;

export const linkContentTypes = [
    `${APP_DESCRIPTOR}:internal-link`,
    `${APP_DESCRIPTOR}:external-link`,
    `${APP_DESCRIPTOR}:url`,
] as const satisfies ContentTypeList;

export const contentTypesInSitemap = [
    ...dynamicPageContentTypes,
    ...legacyPageContentTypes,
    `${APP_DESCRIPTOR}:office-page`,
] as const satisfies ContentTypeList;

export const contentTypesInDataQuery = [
    ...contentTypesInSitemap,
    'media:text',
    'media:document',
    'media:spreadsheet',
    'media:presentation',
] as const satisfies ContentTypeList;

export const contentTypesInContentSwitcher = [
    ...dynamicPageContentTypes,
    ...legacyPageContentTypes,
    ...linkContentTypes,
    `${APP_DESCRIPTOR}:redirects-folder`,
] as const satisfies ContentTypeList;

export const contentTypesWithDeepReferences = [
    'portal:fragment',
    `${APP_DESCRIPTOR}:content-list`,
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:global-case-time-set`,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:payout-dates`,
    `${APP_DESCRIPTOR}:contact-information`,
] as const satisfies ContentTypeList;

export const contentTypesWithBreadcrumbs = [
    `${APP_DESCRIPTOR}:dynamic-page`,
    `${APP_DESCRIPTOR}:main-article`,
    `${APP_DESCRIPTOR}:main-article-chapter`,
    `${APP_DESCRIPTOR}:section-page`,
    `${APP_DESCRIPTOR}:page-list`,
    `${APP_DESCRIPTOR}:transport-page`,
    `${APP_DESCRIPTOR}:large-table`,
    `${APP_DESCRIPTOR}:office-information`,
    `${APP_DESCRIPTOR}:publishing-calendar`,
] as const satisfies ContentTypeList;

export const contentTypesWithComponents = [
    ...dynamicPageContentTypes,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:office-page`,
    'portal:page-template',
] as const satisfies ContentTypeList;

export const contentTypesWithProductDetails = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:guide-page`,
] as const satisfies ContentTypeList;

export const contentTypesInOverviewPages = contentTypesWithProductDetails;

export const contentTypesInAllProductsOverviewPages = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:guide-page`,
] as const satisfies ContentTypeList;

export const contentTypesInFormsOverviewPages = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:guide-page`,
] as const satisfies ContentTypeList;

export const contentTypesRenderedByPublicFrontend = [
    ...legacyPageContentTypes,
    ...dynamicPageContentTypes,
    ...linkContentTypes,
] as const satisfies ContentTypeList;

export const contentTypesRenderedByEditorFrontend = [
    ...contentTypesRenderedByPublicFrontend,
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:global-case-time-set`,
    `${APP_DESCRIPTOR}:contact-information`,
    `${APP_DESCRIPTOR}:calculator`,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:form-details`,
    `${APP_DESCRIPTOR}:office-page`,
    `${APP_DESCRIPTOR}:office-editorial-page`,
    `${APP_DESCRIPTOR}:payout-dates`,
    `${APP_DESCRIPTOR}:video`,
    `${APP_DESCRIPTOR}:publishing-calendar-entry`,
    `${APP_DESCRIPTOR}:user-tests-config`,
    'portal:page-template',
    'portal:fragment',
    'portal:site',
] as const satisfies ContentTypeList;

export const contentTypesWithCustomEditor = [
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:global-case-time-set`,
] as const satisfies ContentTypeList;

export const contentTypesWithFormDetails = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:guide-page`,
] as const satisfies ContentTypeList;

export const contentTypesWithTaxonomy = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:themed-article-page`,
] as const satisfies ContentTypeList;
