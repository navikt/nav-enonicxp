const globalFragment = require('/lib/guillotine/queries/sitecontent/legacyFragments/_global');
const {
    productDetailsFragment,
} = require('/lib/guillotine/queries/sitecontent/legacyFragments/product-details');

// This fragment can cause circular references/stack overflow if imported
// directly into a content-type fragment
const productDetailsTargetMixin = `
    productDetailsTarget {
        ${globalFragment}
        ${productDetailsFragment}
    }
    allPage
`;

module.exports = { productDetailsTargetMixin };
