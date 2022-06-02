import { mergeGuillotineObject } from './merge-json';

describe('Test merge json functions', () => {
    const objectInitial = {
        foo: {
            foo1: {
                bar1: 'foobar',
            },
        },
        fooAsJson: {
            foo1: 'bar1',
            foo2: 'bar2',
        },
    };

    const objectToMerge = JSON.parse(JSON.stringify(objectInitial));
    mergeGuillotineObject(objectToMerge, ['foo']);

    test('fooAsJson should be deleted when foo was specified as a base key', () => {
        expect(objectToMerge.fooAsJson).toBeUndefined();
    });

    test('Fields from the base object should take precedence', () => {
        expect(objectToMerge.foo.foo1).toStrictEqual(objectInitial.foo.foo1);
        expect(objectToMerge.foo.foo2).toEqual(objectInitial.fooAsJson.foo2);
    });
});
