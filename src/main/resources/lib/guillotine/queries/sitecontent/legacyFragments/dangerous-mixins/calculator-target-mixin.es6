const calculatorFragment = require('/lib/guillotine/queries/sitecontent/legacyFragments/calculator');

// This fragment can cause circular references/stack overflow if imported
// directly into a content-type fragment
const calculatorTargetMixin = `
    targetCalculator {
        ${calculatorFragment.fragment}
    }
    filters
`;

module.exports = { calculatorTargetMixin };
