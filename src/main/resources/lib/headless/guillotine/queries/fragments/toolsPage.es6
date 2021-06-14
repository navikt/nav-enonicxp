const { productDataMixin } = require('/lib/headless/guillotine/queries/fragments/_mixins');

const toolsPageFragment = `
    ...on no_nav_navno_ToolsPage {
        data {
            ${productDataMixin}
        }
    }
`;

module.exports = {
    toolsPageFragment,
};
