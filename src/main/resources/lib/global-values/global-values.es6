const contentLib = require('/lib/xp/content');
const { forceArray } = require('/lib/nav-utils');

const getGlobalValueKey = (valueKey, setId) => valueKey && setId && `${setId}-${valueKey}`;

const validTypes = { text: true, number: true };

const getAllGlobalValues = () => {
    const valueSets = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: [`${app.name}:global-value-set`],
        filters: {
            boolean: {
                must: [
                    {
                        exists: [{ field: 'data.values' }],
                    },
                ],
            },
        },
    }).hits;

    return valueSets
        .map((varSet) =>
            forceArray(varSet.data?.values).map((value) => ({
                ...value,
                setId: varSet._id,
                setName: varSet.displayName,
                globalKey: getGlobalValueKey(value.key, varSet._id),
            }))
        )
        .flat();
};

const getGlobalValue = (key, type) => {
    if (!validTypes[type]) {
        log.info(`Invalid type ${type} specified for ${key}`);
        return null;
    }

    const values = getAllGlobalValues();
    const foundValue = values.find((value) => value.globalKey === key);
    if (!foundValue) {
        log.info(`Value not found for key ${key}`);
        return null;
    }

    return foundValue[type];
};

module.exports = {
    getAllGlobalValues,
    getGlobalValue,
};
