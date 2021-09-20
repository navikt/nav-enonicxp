const contentLib = require('/lib/xp/content');
const { getKeyWithoutMacroDescription } = require('/lib/headless/component-utils');
const { findContentsWithHtmlAreaText } = require('/lib/htmlarea/htmlarea');
const { forceArray } = require('/lib/nav-utils');

const globalValuesContentType = `${app.name}:global-value-set`;
const validTypes = { textValue: true, numberValue: true };

const macroKeySeparator = '::';

//
// TODO: remove this when macros have been updated
const getContentIdFromgvKeyLegacy = (gvKey) => {
    const legacyQueryRes = contentLib.query({
        start: 0,
        count: 2,
        contentTypes: [globalValuesContentType],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.valueItems.key',
                        values: [gvKey],
                    },
                },
            },
        },
    }).hits;

    if (legacyQueryRes.length > 1) {
        log.error(`Multiple global values with key ${gvKey} found!`);
        return null;
    }

    if (legacyQueryRes.length === 0) {
        log.info(`No value found for key ${gvKey}`);
        return null;
    }

    return legacyQueryRes[0]._id;
};
const getGlobalValueUsageLegacy = (gvKey) => {
    const results1 = findContentsWithHtmlAreaText(`${gvKey} `);
    const results2 = findContentsWithHtmlAreaText(`${gvKey}\\"`);

    return [...results1, ...results2].map((content) => ({
        id: content._id,
        path: content._path,
        displayName: content.displayName,
    }));
};
const getGlobalValueLegacy = (key, type) => {
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
//
//

const getMacroKeyForGlobalValue = (gvKey, contentId) => {
    return `${gvKey}${macroKeySeparator}${contentId}`;
};

const getGvKeyAndContentIdFromMacroKey = (macroKey) => {
    if (!macroKey) {
        return {
            contentId: null,
            gvKey: null,
        };
    }

    const [gvKey, contentId] = getKeyWithoutMacroDescription(macroKey).split(macroKeySeparator);

    return {
        contentId: contentId || getContentIdFromgvKeyLegacy(gvKey),
        gvKey,
    };
};

const getGlobalValueUsage = (gvKey, contentId) => {
    const macroKey = getMacroKeyForGlobalValue(gvKey, contentId);
    const results = findContentsWithHtmlAreaText(macroKey);

    return results.map((content) => ({
        id: content._id,
        path: content._path,
        displayName: content.displayName,
    }));
};

const getGlobalValueItem = (gvKey, contentId) => {
    const valueSet = contentLib.get({ key: contentId });

    if (!valueSet || valueSet.type !== globalValuesContentType) {
        log.info(`No global value set found for contentId ${contentId}`);
        return null;
    }

    return forceArray(valueSet.data?.valueItems).find((item) => item.key === gvKey);
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

const getGlobalValue = (gvKey, contentId, type) => {
    if (!gvKey) {
        log.info(`Invalid global value key requested from ${contentId}`);
        return null;
    }

    if (!contentId) {
        log.info(
            `Invalid contentId provided for global value key ${gvKey} - trying backwards-compatible retrieval`
        );
        return getGlobalValueLegacy(gvKey, type);
    }

    if (!validTypes[type]) {
        log.info(`Invalid type ${type} specified for global value ${gvKey}`);
        return null;
    }

    const valueSet = getGlobalValueSet(contentId);

    if (!valueSet) {
        log.info(`No value set found for contentRef ${contentId}`);
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

const getGlobalTextValue = (gvKey, contentId) => getGlobalValue(gvKey, contentId, 'textValue');

const getGlobalNumberValue = (gvKey, contentId) => getGlobalValue(gvKey, contentId, 'numberValue');

module.exports = {
    getGlobalValueUsage,
    getGlobalValueUsageLegacy,
    getGlobalValueSet,
    getGlobalTextValue,
    getGlobalNumberValue,
    globalValuesContentType,
    getMacroKeyForGlobalValue,
    getGvKeyAndContentIdFromMacroKey,
    getGlobalValueItem,
};
