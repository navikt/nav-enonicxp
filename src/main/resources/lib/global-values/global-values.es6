const contentLib = require('/lib/xp/content');
const { getKeyWithoutMacroDescription } = require('/lib/headless/component-utils');
const { findContentsWithHtmlAreaText } = require('/lib/htmlarea/htmlarea');
const { forceArray } = require('/lib/nav-utils');

const globalValuesContentType = `${app.name}:global-value-set`;

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
        contentId: contentId,
        gvKey,
    };
};

const getGlobalValueUsage = (gvKey, contentId) => {
    const key = getGlobalValueUniqueKey(gvKey, contentId);

    const macroUsage = findContentsWithHtmlAreaText(key);
    const calcUsage = getGlobalValueCalcUsage(key);

    return [...macroUsage, ...calcUsage].map((content) => ({
        id: content._id,
        path: content._path,
        displayName: content.displayName,
    }));
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

const getGlobalValueContent = (contentId) => {
    if (!contentId) {
        return null;
    }

    const content = contentLib.get({ key: contentId });
    if (!content || content.type !== globalValuesContentType) {
        return null;
    }

    return content;
};

const getGlobalValue = (contentId) => {
    if (!contentId) {
        log.error('Global values: No content id was provided');
        return null;
    }

    const content = getGlobalValueContent(contentId);

    if (!content) {
        log.info(`Global value: No content found for ${contentId}`);
        return null;
    }

    const valuesFound = forceArray(content.data.valueItems).filter((value) => value.key === gvKey);

    if (valuesFound.length === 0) {
        log.error(`Value not found for global value key ${gvKey}`);
        return null;
    }

    if (valuesFound.length > 1) {
        log.error(`Found multiple values with global value key ${gvKey}!`);
        return null;
    }

    const value = valuesFound[0];

    return value.numberValue;
};

module.exports = {
    getGlobalValueUsage,
    getGlobalValueSet: getGlobalValueContent,
    globalValuesContentType,
    getGlobalValueUniqueKey,
    getGvKeyAndContentIdFromUniqueKey,
    getGlobalValueItem,
    getGlobalValue,
};
