import * as contentLib from '/lib/xp/content';
import { logger } from './logging';

export const htmlAreaComponentPaths = [
    'part.config.no-nav-navno.html-area.html',
    'part.config.no-nav-navno.dynamic-alert.content',
];

export const htmlAreaDataPaths = [
    'text',
    'fact',
    'article.data.text',
    'article.data.fact',
    'ingress',
    'editorial',
    'steps.nextStep.next.editorial',
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

    const queryHits = contentLib.query({
        start: 0,
        count: 1000,
        query: `fulltext('${htmlAreaNodePathsString}', '"${text}"', 'AND')`,
    }).hits;

    const hitsFromFragments = queryHits.filter((hit) => hit.type === 'portal:fragment');
    logger.info(
        `Found ${hitsFromFragments.length} fragment hits - ${hitsFromFragments
            .slice(0, 10)
            .map((hit) => hit._path)}`
    );

    return queryHits;
};

export const findContentsWithFragmentMacro = (fragmentId: string) => {
    return findContentsWithHtmlAreaText(fragmentId);
};
