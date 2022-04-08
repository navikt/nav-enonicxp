const globalFragment = require('/lib/guillotine/queries/sitecontent/legacyFragments/_global');
const {
    situationPageFragment,
} = require('/lib/guillotine/queries/sitecontent/legacyFragments/dynamicPage');
const {
    productPageFragment,
} = require('/lib/guillotine/queries/sitecontent/legacyFragments/dynamicPage');
const {
    toolsPageFragment,
} = require('/lib/guillotine/queries/sitecontent/legacyFragments/dynamicPage');
const {
    guidePageFragment,
} = require('/lib/guillotine/queries/sitecontent/legacyFragments/dynamicPage');
const {
    themedArticlePageFragment,
} = require('/lib/guillotine/queries/sitecontent/legacyFragments/dynamicPage');

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
