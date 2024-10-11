import { getNestedValues } from '@navno-app/lib/utils/object-utils';

const testObj = {
    foo: 'bar',
    test: 'fail',
    nested: {
        nestedFoo: 'nestedBar',
    },
    fooArray: ['element1', 'element2'],
    nestedWithArray: {
        barArray: ['element3', 'element4'],
        arrayWithObjects: [{ foo: 'bar' }, { lol: 'wut' }],
        anotherLevel: {
            fooBarArray: ['element5', 'element6', { feed: 'seed' }],
        },
    },
};

describe('Nested values in objects', () => {
    test('Should find value in level 1 entry', () => {
        expect(getNestedValues(testObj, 'foo')).toEqual(testObj.foo);
    });

    test('Should find value in level 2 entry', () => {
        expect(getNestedValues(testObj, 'nested.nestedFoo')).toEqual(testObj.nested.nestedFoo);
    });

    test('Should find elements in level 1 array', () => {
        expect(getNestedValues(testObj, 'fooArray')).toEqual(testObj.fooArray);
    });

    test('Should find elements in level 2 array', () => {
        expect(getNestedValues(testObj, 'nestedWithArray.barArray')).toEqual(
            testObj.nestedWithArray.barArray
        );
    });

    test('Should find value in level 2 array element', () => {
        expect(
            (getNestedValues(testObj, 'nestedWithArray.arrayWithObjects.foo') as any)[0]
        ).toEqual(testObj.nestedWithArray.arrayWithObjects[0].foo);
    });

    test('Should find value in level 3 array element', () => {
        expect(
            (getNestedValues(testObj, 'nestedWithArray.anotherLevel.fooBarArray.feed') as any)[0]
        ).toEqual((testObj.nestedWithArray.anotherLevel.fooBarArray[2] as any).feed);
    });
});
