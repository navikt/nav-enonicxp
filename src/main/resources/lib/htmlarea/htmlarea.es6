const contentLib = require('/lib/xp/content');

const htmlAreaObjectPaths = [
    'data.text',
    'data.fact',
    'components.part.config.no-nav-navno.html-area.html',
    'components.part.config.no-nav-navno.dynamic-alert.content',
];

const includedContentTypes = [
    'dynamic-page',
    'content-page-with-sidemenus',
    'situation-page',
    'main-article',
].map((contentType) => `${app.name}:${contentType}`);

const findContentsWithHtmlAreaText = (text) => {
    const query = htmlAreaObjectPaths.map((objPath) => `${objPath} LIKE "*${text}*"`).join(' OR ');

    const result = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: includedContentTypes,
        query: query,
    });

    return result.hits;
};

const findContentsWithFragmentId = (fragmentId) => {
    return findContentsWithHtmlAreaText(`fragmentId=\\"${fragmentId}`);
};

module.exports = { findContentsWithHtmlAreaText, findContentsWithFragmentId };
