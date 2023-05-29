import { batchedContentQuery } from './batched-query';

export const htmlAreaComponentPaths = [
    'part.config.no-nav-navno.html-area.html',
    'part.config.no-nav-navno.dynamic-alert.content',
    'part.config.no-nav-navno.contact-option.contactOptions.chat.ingress',
    'part.config.no-nav-navno.contact-option.contactOptions.write.ingress',
    'part.config.no-nav-navno.contact-option.contactOptions.call.ingress',
    'part.config.no-nav-navno.contact-option.contactOptions.navoffice.ingress',
    'part.config.no-nav-navno.contact-option.contactOptions.aidcentral.ingress',
    'part.config.no-nav-navno.contact-option.contactOptions.custom.ingress',
    'part.config.no-nav-navno.frontpage-survey-panel.description',
];

export const htmlAreaDataPaths = [
    'text',
    'fact',
    'article.data.text',
    'article.data.fact',
    'ingress',
    'editorial',
    'steps.nextStep.next.editorial',
    'banner.html',
    'contantType.chat.ingress',
    'contantType.write.ingress',
    'pressCall',
];

export const htmlAreaNodePaths = [
    ...htmlAreaDataPaths.map((path) => `data.${path}`),
    ...htmlAreaComponentPaths.map((path) => `components.${path}`),
];

const htmlAreaNodePathsString = htmlAreaNodePaths.join(',');

export const findContentsWithHtmlAreaText = (text: string) => {
    if (!text) {
        return [];
    }

    const queryResult = batchedContentQuery({
        start: 0,
        count: 10000,
        query: `fulltext('${htmlAreaNodePathsString}', '"${text}"', 'AND')`,
    }).hits;

    return queryResult;
};

export const findContentsWithFragmentMacro = (fragmentId: string) => {
    return findContentsWithHtmlAreaText(fragmentId);
};
