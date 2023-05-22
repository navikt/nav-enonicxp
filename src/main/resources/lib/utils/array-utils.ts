import { logger } from './logging';

export const parseJsonArray = <Type = any>(json: string): Type[] | null => {
    try {
        const array = JSON.parse(json);
        if (Array.isArray(array)) {
            return array;
        }
        logger.info(`Expected JSON string to be array, got ${typeof array} - JSON: ${json}`);
        return null;
    } catch (e) {
        logger.info(`Failed to parse JSON string ${json} - ${e}`);
        return null;
    }
};

export const forceArray = <Type>(arrayOrNot?: Type | Type[]) => {
    if (arrayOrNot === undefined || arrayOrNot === null) {
        return [];
    }

    return Array.isArray(arrayOrNot) ? arrayOrNot : [arrayOrNot];
};

export const stringArrayToSet = (list: string[] | readonly string[]): Record<string, boolean> =>
    // @ts-ignore (TS bug? string[] | readonly string[] behaves strangely)
    list.reduce((acc, contentType) => ({ ...acc, [contentType]: true }), {});

export const removeDuplicates = <Type>(
    array: Type[] | ReadonlyArray<Type>,
    isEqualPredicate?: (a: Type, b: Type) => boolean
) => array.filter(duplicatesFilter<Type>(isEqualPredicate));

export const duplicatesFilter = <Type>(isEqualPredicate?: (a: Type, b: Type) => boolean) =>
    isEqualPredicate
        ? (aItem: Type, aIndex: number, array: Type[] | ReadonlyArray<Type>) => {
              const bIndex = array.findIndex((bItem) => isEqualPredicate(aItem, bItem));
              return aIndex === bIndex;
          }
        : (item: Type, index: number, array: Type[] | ReadonlyArray<Type>) =>
              array.indexOf(item) === index;
