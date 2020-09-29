const deepSearchJsonToData = (obj) => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.map(deepSearchJsonToData);
        }

        const newObj = {};
        Object.keys(obj).forEach((key) => {
            if (key === 'dataAsJson') {
                newObj.data = { ...JSON.parse(obj.dataAsJson), ...newObj?.data };
            } else if (key === 'data') {
                newObj.data = { ...newObj.data, ...deepSearchJsonToData(obj.data) };
            } else {
                newObj[key] = deepSearchJsonToData(obj[key]);
            }
        });
        return newObj;
    }
    return obj;
};

export default deepSearchJsonToData;

// Hvorfor fungerer ikke denne når den eksporteres?!!
