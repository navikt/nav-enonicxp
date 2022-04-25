const globalFragment = require('/lib/headless/guillotine/queries/fragments/_global');
const {
    productDetailsFragment,
} = require('/lib/headless/guillotine/queries/fragments/dynamicPage');

// This fragment can cause circular references/stack overflow if imported
// directly into a content-type fragment
const productDetailsTargetMixin = `
    productDetailsTarget {
        ${globalFragment}
        ${productDetailsFragment}
    }
`;

module.exports = { productDetailsTargetMixin };
