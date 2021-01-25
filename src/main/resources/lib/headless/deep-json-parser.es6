const deepParseJson = (obj, parseFrom, appendTo) => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.map((item) => deepParseJson(item, parseFrom, appendTo));
        }

        const newObj = {};

        Object.entries(obj).forEach(([key, value]) => {
            if (key === parseFrom) {
                newObj[appendTo] = { ...JSON.parse(value), ...newObj[appendTo] };
            } else if (key === appendTo) {
                newObj[appendTo] = {
                    ...newObj[appendTo],
                    ...deepParseJson(value, parseFrom, appendTo),
                };
            } else {
                newObj[key] = deepParseJson(value, parseFrom, appendTo);
            }
        });

        return newObj;
    }
    return obj;
};

const deepJsonParser = (initialObject, baseKeys) => {
    return baseKeys.reduce((obj, key) => deepParseJson(obj, `${key}AsJson`, key), initialObject);
};

module.exports = deepJsonParser;
