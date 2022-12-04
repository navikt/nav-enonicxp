import { forceArray } from '../utils/nav-utils';

type Facet = {
    facet: string;
    underfacets?: string[];
};

export const facetsAreEqual = (facets1: Facet | Facet[], facets2: Facet | Facet[]) => {
    const facetsArray1 = forceArray(facets1);
    const facetsArray2 = forceArray(facets2);

    return (
        facetsArray1.length === facetsArray2.length &&
        facetsArray1.every((f1) => {
            const ufArray1 = forceArray(f1.underfacets);
            return facetsArray2.some((f2) => {
                const ufArray2 = forceArray(f2.underfacets);
                return (
                    f1.facet === f2.facet &&
                    ufArray1.length === ufArray2.length &&
                    ufArray1.every((uf1) => ufArray2.some((uf2) => uf1 === uf2))
                );
            });
        })
    );
};
