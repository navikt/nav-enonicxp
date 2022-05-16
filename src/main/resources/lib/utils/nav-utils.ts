import { Content } from '/lib/xp/content';
import { navnoRootPath } from '../constants';
import { MediaDescriptor } from '../../types/content-types/content-config';
import { logger } from './logging';

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

export const parseJsonArray = (json: string): any[] | null => {
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

const hashCode = (str: string) => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        // eslint-disable-next-line
        hash = (hash << 5) - hash + char;
        // eslint-disable-next-line
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

const removeNullProperties = (obj: Record<string, any>) => {
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
            if (!Array.isArray(value) && Object.keys(value).length > 0) {
                acc[key] = removeNullProperties(value);
            }
            if (Array.isArray(value) && value.length > 0) {
                const moddedList = value.map((item) => {
                    if (typeof item === 'object') {
                        return removeNullProperties(item);
                    }
                    return typeof value === 'string' ? value : `${value}`;
                });
                acc[key] = moddedList.length === 1 ? moddedList[0] : moddedList;
            }
        } else if (value !== null) {
            acc[key] = typeof value === 'string' ? value : `${value}`;
        }
        return acc;
    }, {} as Record<string, any>);
};

export const createObjectChecksum = (obj: Record<string, any>) => {
    const cleanObj = removeNullProperties(obj);
    const serializedObj = JSON.stringify(cleanObj).split('').sort().join();
    return hashCode(serializedObj);
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
