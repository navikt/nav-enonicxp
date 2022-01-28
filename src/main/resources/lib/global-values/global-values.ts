import { contentLib } from '../xp-libs';
import { getKeyWithoutMacroDescription } from '../headless/component-utils';
import { findContentsWithHtmlAreaText } from '../htmlarea/htmlarea';
import { forceArray } from '../nav-utils';

export const globalValuesContentType = `${app.name}:global-value-set`;

const uniqueKeySeparator = '::';

// Creates a globally unique key for a global value, as a composite of
// the global value key and the id of the content it belongs to
export const getGlobalValueUniqueKey = (gvKey: string, contentId: string) => {
    return `${gvKey}${uniqueKeySeparator}${contentId}`;
};

export const getGvKeyAndContentIdFromUniqueKey = (key: string) => {
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

export const getGlobalValueUsage = (gvKey: string, contentId: string) => {
    const key = getGlobalValueUniqueKey(gvKey, contentId);

    const macroUsage = findContentsWithHtmlAreaText(key);
    const calcUsage = getGlobalValueCalcUsage(key);

    return [...macroUsage, ...calcUsage];
};

const getGlobalValueCalcUsage = (key: string) => {
    return contentLib.query({
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
};

export const getGlobalValueItem = (gvKey: string, contentId: string) => {
    const globalValueSet = getGlobalValueSet(contentId);

    if (!globalValueSet) {
        log.info(`No global value set found for contentId ${contentId}`);
        return null;
    }

    return forceArray(globalValueSet.data.valueItems).find((item) => item.key === gvKey);
};

export const getGlobalValueSet = (contentId?: string) => {
    if (!contentId) {
        return null;
    }

    const content = contentLib.get({ key: contentId });
    if (content?.type === 'no.nav.navno:global-value-set') {
        return content;
    }

    return null;
};

export const getGlobalValue = (gvKey: string, contentId: string) => {
    if (!gvKey) {
        log.info(`Invalid global value key requested from ${contentId}`);
        return null;
    }

    if (!contentId) {
        log.info(`Invalid contentId provided for global value key ${gvKey}`);
        return null;
    }

    const globalValueSet = getGlobalValueSet(contentId);

    if (!globalValueSet) {
        log.info(`No global value set found for contentId ${contentId}`);
        return null;
    }

    const valuesFound = forceArray(globalValueSet.data.valueItems).filter(
        (value) => value.key === gvKey
    );

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
