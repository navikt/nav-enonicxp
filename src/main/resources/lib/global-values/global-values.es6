const contentLib = require('/lib/xp/content');
const { getKeyWithoutMacroDescription } = require('/lib/headless/component-utils');
const { findContentsWithHtmlAreaText } = require('/lib/htmlarea/htmlarea');
const { forceArray } = require('/lib/nav-utils');

const globalValuesContentType = `${app.name}:global-value-set`;
const validTypes = { numberValue: true };

const uniqueKeySeparator = '::';

// Creates a globally unique key for a global value, as a composite of
// the global value key and the id of the content it belongs to
const getGlobalValueUniqueKey = (gvKey, contentId) => {
    return `${gvKey}${uniqueKeySeparator}${contentId}`;
};

const getGvKeyAndContentIdFromUniqueKey = (key) => {
    if (!key) {
        return {
            contentId: null,
            gvKey: null,
        };
    }

    const [gvKey, contentId] = getKeyWithoutMacroDescription(key).split(uniqueKeySeparator);

    return {
        contentId,
        gvKey,
    };
};

const getGlobalValueUsage = (gvKey, contentId) => {
    const key = getGlobalValueUniqueKey(gvKey, contentId);

    const macroUsage = findContentsWithHtmlAreaText(key);
    const calcUsage = getGlobalValueCalcUsage(key);

    return [...macroUsage, ...calcUsage];
};

const getGlobalValueCalcUsage = (key) =>
    contentLib.query({
        start: 0,
        count: 10000,
        contentTypes: ['no.nav.navno:calculator'],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.fields.globalValue.key',
                        values: [key],
                    },
                },
            },
        },
    }).hits;

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
        log.info(`Invalid contentId provided for global value key ${gvKey}`);
        return null;
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

const getGlobalNumberValue = (gvKey, contentId) => getGlobalValue(gvKey, contentId, 'numberValue');

module.exports = {
    getGlobalValueUsage,
    getGlobalValueSet,
    getGlobalNumberValue,
    globalValuesContentType,
    getGlobalValueUniqueKey,
    getGvKeyAndContentIdFromUniqueKey,
    getGlobalValueItem,
};
