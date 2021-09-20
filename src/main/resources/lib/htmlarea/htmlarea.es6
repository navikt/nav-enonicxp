const contentLib = require('/lib/xp/content');

const htmlAreaComponentPaths = [
    'part.config.no-nav-navno.html-area.html',
    'part.config.no-nav-navno.dynamic-alert.content',
];

const htmlAreaDataPaths = ['text', 'fact'];

const htmlAreaNodePaths = [
    ...htmlAreaDataPaths.map((path) => `data.${path}`),
    ...htmlAreaComponentPaths.map((path) => `components.${path}`),
];

const findContentsWithHtmlAreaText = (text) => {
    const query = htmlAreaNodePaths.map((objPath) => `${objPath} LIKE "*${text}*"`).join(' OR ');

    const queryHits = contentLib.query({
        start: 0,
        count: 1000,
        query: query,
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
