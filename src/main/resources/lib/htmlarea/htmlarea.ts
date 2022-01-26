import { contentLib } from '../xp-libs';

export const htmlAreaComponentPaths = [
    'part.config.no-nav-navno.html-area.html',
    'part.config.no-nav-navno.dynamic-alert.content',
];

export const htmlAreaDataPaths = ['text', 'fact', 'article.data.text', 'article.data.fact'];

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

    // Workaround for searching htmlarea fragments. Query strings or filters don't seem to pick
    // up component config-fields in fragments...
    const fragmentHits = contentLib
        .query({
            start: 0,
            count: 10000,
            contentTypes: ['portal:fragment'],
        })
        .hits.filter(
            (hit) =>
                hit.fragment.type === 'part' &&
                hit.fragment.descriptor === 'no.nav.navno:html-area' &&
                hit.fragment.config?.html?.includes(text),
        );

    return [...queryHits, ...fragmentHits];
};

export const findContentsWithFragmentMacro = (fragmentId: string) => {
    return findContentsWithHtmlAreaText(`fragmentId=\\"${fragmentId}`);
};

export const findContentsWithProductCardMacro = (targetPageId: string) => {
    return findContentsWithHtmlAreaText(`targetPage=\\"${targetPageId}`);
};
