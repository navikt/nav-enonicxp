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

    if (Array.isArray(currentValue)) {
        const values = currentValue
            .map((value) => getNestedValueFromKeyArray(value, rest))
            .filter(Boolean);

        return values.length > 0 ? values : null;
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
