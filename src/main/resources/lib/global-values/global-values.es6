const contentLib = require('/lib/xp/content');
const { forceArray } = require('/lib/nav-utils');

const validTypes = { textValue: true, numberValue: true };

const getGlobalValueUsage = (key) => {
    const result = contentLib.query({
        start: 0,
        count: 10,
        query: `fulltext("data.text, components.part.config.no-nav-navno.html-area.html", "${key}", "AND")`,
    });

    return result.hits;
};

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
                globalKey: value.key,
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
    getGlobalValueUsage,
};
