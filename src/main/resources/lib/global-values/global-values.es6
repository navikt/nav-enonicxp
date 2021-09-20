const contentLib = require('/lib/xp/content');
const { getKeyWithoutMacroDescription } = require('/lib/headless/component-utils');
const { insufficientPermissionResponse } = require('/lib/auth/auth-utils');
const { validateCurrentUserPermissionForContent } = require('/lib/auth/auth-utils');
const { findContentsWithHtmlAreaText } = require('/lib/htmlarea/htmlarea');
const { forceArray } = require('/lib/nav-utils');

const globalValuesContentType = `${app.name}:global-value-set`;
const validTypes = { textValue: true, numberValue: true };

const macroKeySeparator = '::';

const getMacroKeyForGlobalValue = (valueKey, contentId) => {
    return `${valueKey}${macroKeySeparator}${contentId}`;
};

const getValueKeyAndcontentIdFromMacroKey = (macroKey) => {
    if (!macroKey) {
        return {
            contentId: null,
            valueKey: null,
        };
    }

    const [valueKey, contentId] = getKeyWithoutMacroDescription(macroKey).split(macroKeySeparator);

    return {
        contentId,
        valueKey,
    };
};

const getGlobalValueUsage = (valueKey, contentId) => {
    const macroKey = getMacroKeyForGlobalValue(valueKey, contentId);
    const results = findContentsWithHtmlAreaText(macroKey);

    return results.map((content) => ({
        id: content._id,
        path: content._path,
        displayName: content.displayName,
    }));
};

// TODO: remove this when macros have been updated to new format
const getGlobalValueLegacyUsage = (valueKey) => {
    const results1 = findContentsWithHtmlAreaText(`${valueKey} `);
    const results2 = findContentsWithHtmlAreaText(`${valueKey}\\"`);

    return [...results1, ...results2].map((content) => ({
        id: content._id,
        path: content._path,
        displayName: content.displayName,
    }));
};

const getAllValuesFromSet = (varSet, type) => {
    const valueItemsArray = forceArray(varSet.data?.valueItems);

    if (type) {
        return valueItemsArray.reduce((acc, valueItem) => {
            return valueItem[type] !== undefined
                ? [
                      ...acc,
                      {
                          ...valueItem,
                          contentId: varSet._id,
                          setName: varSet.displayName,
                      },
                  ]
                : acc;
        }, []);
    }

    return valueItemsArray.map((valueItem) => ({
        ...valueItem,
        contentId: varSet._id,
        setName: varSet.displayName,
    }));
};

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

    return valueSets.map((varSet) => getAllValuesFromSet(varSet, type)).flat();
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

// TODO: remove this when all macros have been converted to the new format
const backwardsCompatibleGetGlobalValue = (key, type) => {
    if (!key) {
        log.info(`Invalid global value key: ${key}`);
        return null;
    }

    if (!validTypes[type]) {
        log.info(`Invalid type ${type} specified for global value ${key}`);
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
        log.error(`Value not found for global value key ${key}`);
        return null;
    }

    if (valueSets.length > 1) {
        log.error(`Found multiple values with global value key ${key}!`);
        return null;
    }

    const foundValue = forceArray(valueSets[0].data.valueItems).find((value) => value.key === key);
    if (!foundValue) {
        log.error(`Value not found for global value key ${key}`);
        return null;
    }

    return foundValue[type] || foundValue.numberValue;
};

const getGlobalValue = (gvKey, contentRef, type) => {
    if (!gvKey) {
        log.info(`Invalid global value key requested from ${contentRef}`);
        return null;
    }

    if (!contentRef) {
        log.info(
            `Invalid contentRef provided for gv key ${gvKey} - trying backwards-compatible retrieval`
        );
        return backwardsCompatibleGetGlobalValue(gvKey, type);
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
    getGlobalValueLegacyUsage,
    getGlobalValueSet,
    getGlobalTextValue,
    getGlobalNumberValue,
    globalValuesContentType,
    validateGlobalValueInputAndGetErrorResponse,
    getMacroKeyForGlobalValue,
    getValueKeyAndcontentIdFromMacroKey,
};
