const contentLib = require('/lib/xp/content');
const { findContentsWithHtmlAreaText } = require('/lib/htmlarea/htmlarea');
const { forceArray } = require('/lib/nav-utils');

const globalValuesContentType = `${app.name}:global-value-set`;
const validTypes = { textValue: true, numberValue: true };

const getGlobalValueUsage = (key) => {
    const results = findContentsWithHtmlAreaText(key);

    return results.map((content) => ({
        id: content._id,
        path: content._path,
        displayName: content.displayName,
    }));
};

const getValuesOfTypeFromSet = (type) => (varSet) =>
    forceArray(varSet.data.valueItems).reduce((acc, valueItem) => {
        return valueItem[type] !== undefined
            ? [
                  ...acc,
                  {
                      ...valueItem,
                      setId: varSet._id,
                      setName: varSet.displayName,
                  },
              ]
            : acc;
    }, []);

const getAllValuesFromSet = (varSet) =>
    forceArray(varSet.data?.valueItems).map((valueItem) => ({
        ...valueItem,
        setId: varSet._id,
        setName: varSet.displayName,
    }));

const getAllGlobalValues = (type, query) => {
    if (type && !validTypes[type]) {
        log.info(`Invalid type ${type} specified for all values query`);
        return [];
    }

    const valueSets = contentLib.query({
        start: 0,
        count: 10000,
        contentTypes: [globalValuesContentType],
        query: query && `fulltext("data.valueItems.itemName, displayName", "${query}", "AND")`,
        filters: {
            boolean: {
                must: [
                    {
                        exists: [{ field: 'data.valueItems' }],
                    },
                ],
            },
        },
    }).hits;

    if (type) {
        return valueSets.map(getValuesOfTypeFromSet(type)).flat();
    }

    return valueSets.map(getAllValuesFromSet).flat();
};

const getGlobalValue = (key, type) => {
    if (!validTypes[type]) {
        log.info(`Invalid type ${type} specified for ${key}`);
        return null;
    }

    const valueSets = contentLib.query({
        start: 0,
        count: 2,
        contentTypes: [globalValuesContentType],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.valueItems.key',
                        values: [key],
                    },
                },
            },
        },
    }).hits;

    if (valueSets.length === 0) {
        log.error(`Value not found for key ${key}`);
        return null;
    }

    if (valueSets.length > 1) {
        log.error(`Found multiple values with key ${key}!`);
        return null;
    }

    const foundValue = forceArray(valueSets[0].data.valueItems).find((value) => value.key === key);
    if (!foundValue) {
        log.error(`Value not found for key ${key}`);
        return null;
    }

    return foundValue[type] || foundValue.numberValue;
};

const getGlobalValueSet = (contentId) => {
    if (!contentId) {
        return null;
    }

    const content = contentLib.get({ key: contentId });
    if (!content || content.type !== globalValuesContentType) {
        return null;
    }

    return content;
};

module.exports = {
    getAllGlobalValues,
    getGlobalValue,
    getGlobalValueUsage,
    getGlobalValueSet,
};
