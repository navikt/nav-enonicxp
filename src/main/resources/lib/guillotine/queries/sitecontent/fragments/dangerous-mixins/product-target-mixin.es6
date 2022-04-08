const globalFragment = require('/lib/guillotine/queries/sitecontent/fragments/_global');
const { situationPageFragment } = require('/lib/guillotine/queries/sitecontent/fragments/dynamicPage');
const { productPageFragment } = require('/lib/guillotine/queries/sitecontent/fragments/dynamicPage');
const { toolsPageFragment } = require('/lib/guillotine/queries/sitecontent/fragments/dynamicPage');
const { guidePageFragment } = require('/lib/guillotine/queries/sitecontent/fragments/dynamicPage');
const {
    themedArticlePageFragment,
} = require('/lib/guillotine/queries/sitecontent/fragments/dynamicPage');

// This fragment can cause circular references/stack overflow if imported
// directly into a content-type fragment
const productTargetMixin = `
    targetPage {
        ${globalFragment}
        ${productPageFragment}
        ${situationPageFragment}
        ${themedArticlePageFragment}
        ${toolsPageFragment}
        ${guidePageFragment}
    }
`;

module.exports = { productTargetMixin };
