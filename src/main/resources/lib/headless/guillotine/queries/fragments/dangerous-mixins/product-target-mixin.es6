const globalFragment = require('/lib/headless/guillotine/queries/fragments/_global');
const { situationPageFragment } = require('/lib/headless/guillotine/queries/fragments/dynamicPage');
const { productPageFragment } = require('/lib/headless/guillotine/queries/fragments/dynamicPage');
const { toolsPageFragment } = require('/lib/headless/guillotine/queries/fragments/toolsPage');

// This fragment can cause circular references/stack overflow if imported
// directly into a content-type fragment
const productTargetMixin = `
    targetPage {
        ${globalFragment}
        ${productPageFragment}
        ${situationPageFragment}
        ${toolsPageFragment}
    }
`;

module.exports = { productTargetMixin };
