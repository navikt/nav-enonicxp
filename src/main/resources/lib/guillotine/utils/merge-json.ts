// Merges "xAsJson" objects from a Guillotine query into their base objects
export const mergeGuillotineObject = (
    obj: Record<string, any>,
    baseKeys: string[]
): Record<string, any> => {
    baseKeys.forEach((baseKey) => {
        const jsonKey = `${baseKey}AsJson`;
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
                obj[key] = mergeGuillotineArray(value, baseKeys);
            } else {
                obj[key] = mergeGuillotineObject(value, baseKeys);
            }
        }
    });

    return obj;
};

export const mergeGuillotineArray = (array: any[], baseKeys: string[]): any[] =>
    array.map((item) => (typeof item === 'object' ? mergeGuillotineObject(item, baseKeys) : item));
