const deepParseJson = (obj, parseFrom, appendTo) => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.map((item) => deepParseJson(item, parseFrom, appendTo));
        }

        const newObj = {};

        Object.keys(obj).forEach((key) => {
            if (key === parseFrom) {
                newObj[appendTo] = { ...JSON.parse(obj[parseFrom]), ...newObj[appendTo] };
            } else if (key === appendTo) {
                newObj[appendTo] = {
                    ...newObj[appendTo],
                    ...deepParseJson(obj[appendTo], parseFrom, appendTo),
                };
            } else {
                newObj[key] = deepParseJson(obj[key], parseFrom, appendTo);
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
