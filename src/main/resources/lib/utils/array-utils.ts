import { logger } from './logging';

export const parseJsonToArray = <Type = unknown>(json: string): Type[] | null => {
    try {
        const isStringifiedArray = json.startsWith('[') && json.endsWith(']');
        return isStringifiedArray ? JSON.parse(json) : forceArray(json) as Type[];
    } catch (e) {
        logger.info(`Failed to parse JSON string ${json} - ${e}`);
        return null;
    }
};

export const forceArray = <Type>(arrayOrNot?: Type | Type[] | null) => {
    if (arrayOrNot === undefined || arrayOrNot === null) {
        return [];
    }

    return Array.isArray(arrayOrNot) ? arrayOrNot : [arrayOrNot];
};

export const removeDuplicates = <Type>(
    array: Type[] | ReadonlyArray<Type>,
    isEqualPredicate?: (a: Type, b: Type) => boolean
) => array.filter(removeDuplicatesFilter<Type>(isEqualPredicate));

export const removeDuplicatesFilter = <Type>(isEqualPredicate?: (a: Type, b: Type) => boolean) =>
    isEqualPredicate
        ? (aItem: Type, aIndex: number, array: Type[] | ReadonlyArray<Type>) => {
              const bIndex = array.findIndex((bItem) => isEqualPredicate(aItem, bItem));
              return aIndex === bIndex;
          }
        : (item: Type, index: number, array: Type[] | ReadonlyArray<Type>) =>
              array.indexOf(item) === index;

export const iterableToArray = <Type>(iterable: IterableIterator<Type>): Type[] => {
    const array: Type[] = [];

    for (const item of iterable) {
        array.push(item);
    }

    return array;
};
