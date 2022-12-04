import { facetsAreEqual } from './facetsCompare';

const facetSingle1 = { facet: 'asdf', underfacets: ['qwer', 'zxcv'] };
const facetSingle2 = { facet: 'asdf2', underfacets: ['qwer', 'zxcv'] };

const facetsArray1 = [
    { facet: 'asdf1', underfacets: ['qwer', 'zxcv'] },
    { facet: 'asdf2', underfacets: ['qwer', 'zxcv'] },
];
const facetsArray2 = [
    { facet: 'asdf3', underfacets: ['qwer', 'zxcv'] },
    { facet: 'asdf4', underfacets: ['qwer', 'zxcv'] },
];

const facetsArray3Order1 = [
    { facet: 'asdf5', underfacets: ['qwer', 'zxcv'] },
    { facet: 'asdf6', underfacets: ['qwer', 'zxcv'] },
];
const facetsArray3Order2 = [
    { facet: 'asdf6', underfacets: ['qwer', 'zxcv'] },
    { facet: 'asdf5', underfacets: ['zxcv', 'qwer'] },
];

describe('Facets equality comparison', () => {
    test('Single facets should be equal', () => {
        expect(facetsAreEqual(facetSingle1, facetSingle1)).toBeTruthy();
    });

    test('Facets arrays should be equal', () => {
        expect(facetsAreEqual(facetsArray1, facetsArray1)).toBeTruthy();
    });

    test('Facets with the same elements in different order should be equal', () => {
        expect(facetsAreEqual(facetsArray3Order1, facetsArray3Order2)).toBeTruthy();
    });

    test('Different single facets should be non-equal', () => {
        expect(facetsAreEqual(facetSingle1, facetSingle2)).toBeFalsy();
    });

    test('Facets arrays with different elements should be non-equal', () => {
        expect(facetsAreEqual(facetsArray1, facetsArray2)).toBeFalsy();
    });
});
