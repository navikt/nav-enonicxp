const {
    processedHtmlFragment,
} = require('/lib/guillotine/queries/sitecontent/fragments/_processedHtml');

const largeTableFragment = `
    ...on no_nav_navno_LargeTable {
        data {
            text ${processedHtmlFragment}
        }
    }
`;

module.exports = { fragment: largeTableFragment };
