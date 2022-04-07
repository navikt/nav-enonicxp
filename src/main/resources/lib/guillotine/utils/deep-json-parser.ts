type RecordValue = DeepRecord | string | Array<DeepRecord | string>;

type DeepRecord = {
    [key: string]: RecordValue;
};

const mergeJson = (obj: DeepRecord, targetKey: string) => {};

const deepParseJson = (
    obj: DeepRecord | string,
    parseFrom: string,
    appendTo: string
): DeepRecord => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.map((item) => deepParseJson(item, parseFrom, appendTo));
        }

        const newObj: DeepKVObject = {};

        Object.entries(obj).forEach(([key, value]) => {
            const valueIsArray = Array.isArray(value);

            if (key === parseFrom) {
                if (valueIsArray) {
                    newObj[appendTo] = [
                        ...deepParseJson(value, parseFrom, appendTo),
                        ...(newObj[appendTo] ? newObj[appendTo] : []),
                    ];
                } else {
                    newObj[appendTo] = {
                        ...deepParseJson(value, parseFrom, appendTo),
                        ...newObj[appendTo],
                    };
                }
            } else if (key === appendTo) {
                if (valueIsArray) {
                    newObj[appendTo] = [
                        ...newObj[appendTo],
                        ...deepParseJson(value, parseFrom, appendTo),
                    ];
                } else {
                    newObj[appendTo] = {
                        ...newObj[appendTo],
                        ...deepParseJson(value, parseFrom, appendTo),
                    };
                }
            } else {
                newObj[key] = deepParseJson(value, parseFrom, appendTo);
            }
        });

        return newObj;
    }

    return obj;
};

export const deepJsonParser = (initialObject: DeepKVObject, baseKeys: string[]) => {
    return baseKeys.reduce((obj, key) => deepParseJson(obj, `${key}AsJson`, key), initialObject);
};
