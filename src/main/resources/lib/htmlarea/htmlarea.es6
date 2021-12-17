const contentLib = require('/lib/xp/content');

const htmlAreaComponentPaths = [
    'part.config.no-nav-navno.html-area.html',
    'part.config.no-nav-navno.dynamic-alert.content',
];

const htmlAreaDataPaths = ['text', 'fact', 'article.data.text', 'article.data.fact'];

const htmlAreaNodePaths = [
    ...htmlAreaDataPaths.map((path) => `data.${path}`),
    ...htmlAreaComponentPaths.map((path) => `components.${path}`),
];

const htmlAreaNodePathsString = htmlAreaNodePaths.join(',');

const findContentsWithHtmlAreaText = (text) => {
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
        .hits.filter((hit) => hit?.fragment?.config?.html?.includes(text));

    return [...queryHits, ...fragmentHits];
};

const findContentsWithFragmentMacro = (fragmentId) => {
    return findContentsWithHtmlAreaText(`fragmentId=\\"${fragmentId}`);
};

const findContentsWithProductCardMacro = (targetPageId) => {
    return findContentsWithHtmlAreaText(`targetPage=\\"${targetPageId}`);
};

module.exports = {
    findContentsWithHtmlAreaText,
    findContentsWithFragmentMacro,
    findContentsWithProductCardMacro,
    htmlAreaComponentPaths,
    htmlAreaDataPaths,
    htmlAreaNodePaths,
};
