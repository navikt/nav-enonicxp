const {
    processedHtmlFragment,
} = require('/lib/headless/guillotine/queries/fragments/_processedHtml');

const largeTableFragment = `
    ...on no_nav_navno_LargeTable {
        data {
            text ${processedHtmlFragment}
        }
    }
`;

module.exports = { fragment: largeTableFragment };
