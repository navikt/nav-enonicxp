import { AsJsonKey, GuillotineArray, GuillotineRecord } from '../guillotine-query';

// Merges "xAsJson" objects from a Guillotine query into their base objects
export const mergeGuillotineObjectJson = (
    obj: GuillotineRecord,
    baseKeys: string[]
): GuillotineRecord => {
    baseKeys.forEach((baseKey) => {
        const jsonKey = `${baseKey}AsJson` as AsJsonKey;
        const jsonObject = obj[jsonKey];

        if (jsonObject) {
            const baseObject = obj[baseKey];
            // Fields from the base object should take precedence, as these will have been individually specified
            // in the guillotine query and may have deeper sub-queries or custom resolver functions
            obj[baseKey] = { ...jsonObject, ...(typeof baseObject === 'object' && baseObject) };
            delete obj[jsonKey];
        }
    });

    Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
                obj[key] = mergeGuillotineArrayJson(value, baseKeys);
            } else {
                obj[key] = mergeGuillotineObjectJson(value, baseKeys);
            }
        }
    });

    return obj;
};

export const mergeGuillotineArrayJson = (
    array: GuillotineArray,
    baseKeys: string[]
): GuillotineArray =>
    array.map((item) =>
        typeof item === 'object' ? mergeGuillotineObjectJson(item, baseKeys) : item
    );
