import { generateUUID } from './uuid';

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

type NestedObject = {
    [key: string]: any;
};

export const findNestedKey = (obj: NestedObject, searchKey: string): any => {
    for (const key in obj) {
        if (key === searchKey) {
            return obj[key];
        }

        if (typeof obj[key] === 'object') {
            const result = findNestedKey(obj[key], searchKey);
            if (result !== null) {
                return result;
            }
        }

        if (Array.isArray(obj[key])) {
            for (const item of obj[key]) {
                if (typeof item === 'object') {
                    const result = findNestedKey(item, searchKey);
                    if (result !== null) {
                        return result;
                    }
                }
            }
        }
    }

    return null;
};
