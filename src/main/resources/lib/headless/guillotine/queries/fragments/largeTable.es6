const { processedHtmlMixin } = require('/lib/headless/guillotine/queries/fragments/_mixins');

const largeTableFragment = `
    ...on no_nav_navno_LargeTable {
        data {
            text ${processedHtmlMixin}
        }
    }
`;

module.exports = { fragment: largeTableFragment };
