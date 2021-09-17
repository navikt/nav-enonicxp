const contentLib = require('/lib/xp/content');
const { insufficientPermissionResponse } = require('/lib/auth/auth-utils');
const { validateCurrentUserPermissionForContent } = require('/lib/auth/auth-utils');
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
        log.info(`Invalid type ${type} specified for all global values query`);
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

const getGlobalValueSet = (contentRef) => {
    if (!contentRef) {
        return null;
    }

    const content = contentLib.get({ key: contentRef });
    if (!content || content.type !== globalValuesContentType) {
        return null;
    }

    return content;
};

const getGlobalValue = (gvKey, contentRef, type) => {
    if (!gvKey) {
        log.info(`Invalid global value key requested from ${contentRef}`);
        return null;
    }

    if (!contentRef) {
        log.info(`Invalid contentRef provided for gv key ${gvKey}`);
        return null;
    }

    if (!validTypes[type]) {
        log.info(`Invalid type ${type} specified for global value ${gvKey}`);
        return null;
    }

    const valueSet = getGlobalValueSet(contentRef);

    if (!valueSet) {
        log.info(`No value set found for contentRef ${contentRef}`);
        return null;
    }

    const valuesFound = forceArray(valueSet.data.valueItems).filter((value) => value.key === gvKey);

    if (valuesFound.length === 0) {
        log.error(`Value not found for global value key ${gvKey}`);
        return null;
    }

    if (valuesFound.length > 1) {
        log.error(`Found multiple values with global value key ${gvKey}!`);
        return null;
    }

    const value = valuesFound[0];

    return value[type] || value.numberValue;
};

const getGlobalTextValue = (key, contentRef) => getGlobalValue(key, contentRef, 'textValue');
const getGlobalNumberValue = (key, contentRef) => getGlobalValue(key, contentRef, 'numberValue');

const validateGlobalValueInputAndGetErrorResponse = ({
    contentId,
    itemName,
    textValue,
    numberValue,
}) => {
    if (!validateCurrentUserPermissionForContent(contentId, 'MODIFY')) {
        return insufficientPermissionResponse('MODIFY');
    }

    const hasValue = textValue || numberValue !== undefined;

    if (!contentId || !itemName || !hasValue) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message:
                    'Missing parameters:' +
                    `${!contentId && ' contentId'}` +
                    `${!itemName && ' itemName'}` +
                    `${!hasValue && ' textValue or numberValue'}`,
            },
        };
    }

    if (numberValue !== undefined && isNaN(numberValue)) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: `numberValue ${numberValue} must be a number`,
            },
        };
    }

    return null;
};

module.exports = {
    getAllGlobalValues,
    getGlobalValueUsage,
    getGlobalValueSet,
    getGlobalTextValue,
    getGlobalNumberValue,
    globalValuesContentType,
    validateGlobalValueInputAndGetErrorResponse,
};
