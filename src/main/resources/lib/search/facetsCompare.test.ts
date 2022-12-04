import { facetsAreEqual } from './facetsCompare';

describe('Facets', () => {
    const facets1 = { facet: 'asdf', underfacets: ['qwer, zxcv'] };
    const facets2 = { facet: 'asdf2', underfacets: ['qwer, zxcv'] };

    test('Facets should be equal', () => {
        const areEqual = facetsAreEqual(facets1, facets1);
        expect(areEqual).toBeTruthy();
    });

    test('Facets should be non-equal', () => {
        const areEqual = facetsAreEqual(facets1, facets2);
        expect(areEqual).toBeFalsy();
    });
});
