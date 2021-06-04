const contentLib = require('/lib/xp/content');

// TODO: can this be auto-generated somehow...?
const htmlAreaObjectPaths = [
    'data.text',
    'data.fact',
    'components.part.config.no-nav-navno.html-area.html',
    'components.part.config.no-nav-navno.dynamic-alert.content'
].join(', ');

const findContentWithHtmlAreaText = (text, contentTypes) => {
    const result = contentLib.query({
        start: 0,
        count: 10,
        contentTypes: contentTypes,
        query: `fulltext("${htmlAreaObjectPaths}", "${text}", "AND")`,
    }).hits;

    return result;
};

module.exports = { findContentWithHtmlAreaText };
