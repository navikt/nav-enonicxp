import { ContentDescriptor } from 'types/content-types/content-config';
import { APP_DESCRIPTOR } from '../constants';

export const contentTypesToMigrate: ContentDescriptor[] = [
    // `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    // `${APP_DESCRIPTOR}:situation-page`,
    // `${APP_DESCRIPTOR}:guide-page`,
    // `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:tools-page`,
    `${APP_DESCRIPTOR}:generic-page`,
    // `${APP_DESCRIPTOR}:current-topic-page`,
];

export const keysToMigrate: { [key: string]: string[] } = {
    [`${APP_DESCRIPTOR}:content-page-with-sidemenus`]: [
        'audience',
        'illustration',
        'owner',
        'area',
        'managed-by',
        'taxonomy',
        'processing_times',
        'payout_dates',
        'rates',
        'formDetailsTargets',
        'feedbackToggle',
        'chatbotToggle',
        'hideFromProductlist',
        'customPath',
    ],
    [`${APP_DESCRIPTOR}:situation-page`]: [],
    [`${APP_DESCRIPTOR}:guide-page`]: [],
    [`${APP_DESCRIPTOR}:themed-article-page`]: [],
    [`${APP_DESCRIPTOR}:tools-page`]: [
        'audience',
        'taxonomy',
        'area',
        'illustration',
        'customPath',
        'owner',
        'managed-by',
    ],
    [`${APP_DESCRIPTOR}:generic-page`]: [
        'audience',
        'illustration',
        'customPath',
        'feedbackToggle',
        'chatbotToggle',
        'noindex',
    ],
    [`${APP_DESCRIPTOR}:current-topic-page`]: [],
};

export const allValidTaxonomies: { [key: string]: string[] } = {
    [`${APP_DESCRIPTOR}:tools-page`]: ['calculator', 'navigator'],
    [`${APP_DESCRIPTOR}:content-page-with-sidemenus`]: [
        'insurance',
        'measures',
        'service',
        'rights',
        'assistive_tools',
        'benefits',
        'employee_benefits',
        'refund',
    ],
};
