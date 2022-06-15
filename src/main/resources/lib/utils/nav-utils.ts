import { Content } from '/lib/xp/content';
import { navnoRootPath } from '../constants';
import { MediaDescriptor } from '../../types/content-types/content-config';
import { logger } from './logging';
import { generateUUID } from './uuid';

// TODO: rydd i denne fila

export const getParentPath = (path: string) => path.split('/').slice(0, -1).join('/');

export const removeDuplicates = <Type>(
    array: Type[],
    isEqualPredicate?: (a: Type, b: Type) => boolean
) =>
    isEqualPredicate
        ? array.filter((aItem, aIndex) => {
              const bIndex = array.findIndex((bItem) => isEqualPredicate(aItem, bItem));
              return aIndex === bIndex;
          })
        : array.filter((item, index) => array.indexOf(item) === index);

export const getUnixTimeFromDateTimeString = (datetime?: string): number => {
    if (!datetime) {
        return 0;
    }

    const validDateTime = datetime.split('.')[0];
    return new Date(validDateTime).getTime();
};

export const parseJsonArray = <Type = any>(json: string): Type[] | null => {
    try {
        const array = JSON.parse(json);
        if (Array.isArray(array)) {
            return array;
        }
        logger.error(`Expected JSON string to be array, got ${typeof array} - JSON: ${json}`);
        return null;
    } catch (e) {
        logger.error(`Failed to parse JSON string ${json} - ${e}`);
        return null;
    }
};

// Date formats on content created in XP7 is not necessarily
// supported in the Date wrapper in XP7 (but it does work in browsers)
export const fixDateFormat = (date: string) => {
    if (date.indexOf('.') !== -1) {
        return date.split('.')[0] + 'Z';
    }
    return date;
};

export const forceArray = <Type>(arrayOrNot?: Type | Type[]) => {
    if (arrayOrNot === undefined || arrayOrNot === null) {
        return [];
    }

    return Array.isArray(arrayOrNot) ? arrayOrNot : [arrayOrNot];
};

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => {
    return value !== null && value !== undefined;
};

// Get a nested object value from an array of keys
export const getNestedValueFromKeyArray = (obj: Record<string, any>, keys: string[]): any => {
    if (!keys || keys.length === 0 || !obj || typeof obj !== 'object') {
        return null;
    }

    const [currentKey, ...rest] = keys;
    const currentValue = obj[currentKey];

    if (rest.length === 0) {
        return currentValue;
    }

    return getNestedValueFromKeyArray(currentValue, rest);
};

// Get a nested object value from a dot-delimited string of keys
export const getNestedValue = (obj: Record<string, any>, keysString: string) => {
    return getNestedValueFromKeyArray(obj, keysString?.split('.'));
};

export const createObjectChecksum = (obj: Record<string, any>) => {
    return generateUUID(JSON.stringify(obj));
};

const navnoRootPathFilter = new RegExp(`^${navnoRootPath}`);

export const stripPathPrefix = (_path: string) => _path.replace(navnoRootPathFilter, '');

export const stringArrayToSet = (list: string[] | readonly string[]): Record<string, boolean> =>
    // @ts-ignore (TS bug? string[] | readonly string[] behaves strangely)
    list.reduce((acc, contentType) => ({ ...acc, [contentType]: true }), {});

export const isMedia = (content: Content): content is Content & { type: MediaDescriptor } =>
    content.type.startsWith('media:');

const Thread = Java.type('java.lang.Thread');

export const getCurrentThreadId = () => Number(Thread.currentThread().getId());

export const serializableObjectsAreEqual = (obj1: object, obj2: object) =>
    JSON.stringify(obj1) === JSON.stringify(obj2);

export const generateFulltextQuery = (
    query: string,
    fieldsToSearch: string[],
    logicOp: 'AND' | 'OR'
) => {
    const wordsWithWildcard = query
        ?.split(' ')
        .map((word) => `${word}*`)
        .join(' ');

    return `fulltext("${fieldsToSearch.join(',')}", "${wordsWithWildcard}", "${logicOp}")`;
};
