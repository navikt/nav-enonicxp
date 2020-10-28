const deepParseAndAppendJsonData = (obj, parseFrom, appendTo) => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.map((item) => deepParseAndAppendJsonData(item, parseFrom, appendTo));
        }

        const newObj = {};

        Object.keys(obj).forEach((key) => {
            if (key === parseFrom) {
                newObj[appendTo] = { ...JSON.parse(obj[parseFrom]), ...newObj[appendTo] };
            } else if (key === appendTo) {
                newObj[appendTo] = {
                    ...newObj[appendTo],
                    ...deepParseAndAppendJsonData(obj[appendTo], parseFrom, appendTo),
                };
            } else {
                newObj[key] = deepParseAndAppendJsonData(obj[key], parseFrom, appendTo);
            }
        });

        return newObj;
    }
    return obj;
};

module.exports = deepParseAndAppendJsonData;
