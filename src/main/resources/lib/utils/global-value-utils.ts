import contentLib, { Content } from '/lib/xp/content';
import { getKeyWithoutMacroDescription } from './component-utils';
import { findContentsWithHtmlAreaText } from './htmlarea-utils';
import { forceArray } from './nav-utils';
import { NavNoDescriptor } from '../../types/common';
import { logger } from './logging';

export const globalValuesContentType: NavNoDescriptor<'global-value-set'> =
    'no.nav.navno:global-value-set';

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
        logger.info(`No global value set found for contentId ${contentId}`);
        return null;
    }

    return forceArray(globalValueSet.data.valueItems).find((item) => item.key === gvKey);
};

export const getGlobalValueSet = (
    contentId?: string
): Content<typeof globalValuesContentType> | null => {
    if (!contentId) {
        return null;
    }

    const content = contentLib.get({ key: contentId });
    if (content?.type === globalValuesContentType) {
        return content;
    }

    return null;
};

export const getGlobalValue = (gvKey: string | null, contentId: string | null) => {
    if (!gvKey) {
        logger.warning(`Invalid global value key requested from ${contentId}`);
        return null;
    }

    if (!contentId) {
        logger.warning(`Invalid contentId provided for global value key ${gvKey}`);
        return null;
    }

    const globalValueSet = getGlobalValueSet(contentId);

    if (!globalValueSet) {
        logger.warning(`No global value set found for contentId ${contentId}`);
        return null;
    }

    const valuesFound = forceArray(globalValueSet.data.valueItems).filter(
        (value) => value.key === gvKey
    );

    if (valuesFound.length === 0) {
        logger.warning(`Value not found for global value key ${gvKey}`);
        return null;
    }

    if (valuesFound.length > 1) {
        logger.critical(`Found multiple values with global value key ${gvKey}!`);
        return null;
    }

    const value = valuesFound[0];

    return value.numberValue;
};
