const contentLib = require('/lib/xp/content');
const { getKeyWithoutMacroDescription } = require('/lib/headless/component-utils');
const { findContentsWithHtmlAreaText } = require('/lib/htmlarea/htmlarea');
const { forceArray } = require('/lib/nav-utils');

const globalValuesContentType = `${app.name}:global-value-set`;

const legacyKeySeparator = '::';

const getGlobalValueContentIdFromMacroKey = (key) => {
    if (!key) {
        return null;
    }

    const [contentId, contentIdLegacy] = getKeyWithoutMacroDescription(key).split(
        legacyKeySeparator
    );

    return contentIdLegacy || contentId;
};

const getGlobalValueUsage = (contentId) => {
    const macroUsage = findContentsWithHtmlAreaText(contentId);
    const calcUsage = getGlobalValueCalcUsage(contentId);

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

    const values = forceArray(content.data.valueItems);

    if (values.length === 0) {
        log.error(`Global value not found for ${contentId}`);
        return null;
    }

    if (values.length > 1) {
        log.error(`Multiple global values found for ${contentId}!`);
        return null;
    }

    return values[0].numberValue;
};

module.exports = {
    getGlobalValueUsage,
    getGlobalValueContent,
    globalValuesContentType,
    getGlobalValueContentIdFromMacroKey,
    getGlobalValue,
};
