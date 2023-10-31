import { ContentDescriptor } from 'types/content-types/content-config';
import { APP_DESCRIPTOR } from '../../lib/constants';

export type ParamType = { [key: string]: string };

export const contentTypesToMigrate: ContentDescriptor[] = [
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
    `${APP_DESCRIPTOR}:situation-page`,
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:tools-page`,
    `${APP_DESCRIPTOR}:generic-page`,
    `${APP_DESCRIPTOR}:current-topic-page`,
];

export const contentTypesToNewVersionMap: { [key: string]: string } = {
    [`${APP_DESCRIPTOR}:content-page-with-sidemenus`]: `${APP_DESCRIPTOR}:product-page-v2`,
    [`${APP_DESCRIPTOR}:situation-page`]: `${APP_DESCRIPTOR}:situation-page-v2`,
    [`${APP_DESCRIPTOR}:guide-page`]: `${APP_DESCRIPTOR}:guide-page-v2`,
    [`${APP_DESCRIPTOR}:themed-article-page`]: `${APP_DESCRIPTOR}:themed-article-page-v2`,
    [`${APP_DESCRIPTOR}:tools-page`]: `${APP_DESCRIPTOR}:tools-page-v2`,
    [`${APP_DESCRIPTOR}:generic-page`]: `${APP_DESCRIPTOR}:generic-page-v2`,
    [`${APP_DESCRIPTOR}:current-topic-page`]: `${APP_DESCRIPTOR}:current-topic-page-v2`,
};

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
    ],
    [`${APP_DESCRIPTOR}:situation-page`]: [
        'audience',
        'illustration',
        'owner',
        'area',
        'managed-by',
        'feedbackToggle',
        'chatbotToggle',
    ],
    [`${APP_DESCRIPTOR}:guide-page`]: [
        'audience',
        'illustration',
        'owner',
        'area',
        'managed-by',
        'processing_times',
        'payout_dates',
        'rates',
        'formDetailsTargets',
        'hideFromProductlist',
        'feedbackToggle',
        'chatbotToggle',
    ],
    [`${APP_DESCRIPTOR}:themed-article-page`]: [
        'audience',
        'illustration',
        'owner',
        'area',
        'managed-by',
        'taxonomy',
        'processing_times',
        'payout_dates',
        'rates',
        'feedbackToggle',
        'chatbotToggle',
    ],
    [`${APP_DESCRIPTOR}:tools-page`]: [
        'audience',
        'taxonomy',
        'area',
        'illustration',
        'owner',
        'managed-by',
    ],
    [`${APP_DESCRIPTOR}:generic-page`]: [
        'audience',
        'illustration',
        'feedbackToggle',
        'chatbotToggle',
    ],
    [`${APP_DESCRIPTOR}:current-topic-page`]: [
        'audience',
        'owner',
        'area',
        'managed-by',
        'feedbackToggle',
        'chatbotToggle',
    ],
};

export const allValidTaxonomies: { [key: string]: string[] } = {
    [`${APP_DESCRIPTOR}:tools-page`]: ['calculator', 'navigator'],
    [`${APP_DESCRIPTOR}:themed-article-page`]: [
        'tips_job',
        'help_work',
        'when_sick',
        'payment',
        'complaint_rights',
        'user_support',
        'about_nav',
        'membership_national_insurance',
        'recruitment',
    ],
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
