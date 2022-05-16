import contentLib from '/lib/xp/content';
import { getKeyWithoutMacroDescription } from '../utils/component-utils';
import { findContentsWithHtmlAreaText } from '../utils/htmlarea-utils';
import { forceArray } from '../utils/nav-utils';
import { logger } from '../utils/logging';
import { GlobalNumberValueItem } from '../../types/content-types/global-value-set';
import { CaseTimeItem } from '../../types/content-types/global-case-time-set';
import { GlobalValueContentTypes, isGlobalValueSetType } from './types';

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
        count: 1000,
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

export const getGlobalValueItem = <Type extends GlobalValueContentTypes>(
    gvKey: string,
    content: Type
) => {
    const valuesFound = forceArray(content.data.valueItems).filter((value) => value.key === gvKey);

    if (valuesFound.length === 0) {
        logger.warning(`Value not found for global value key ${gvKey}`);
        return null;
    }

    if (valuesFound.length > 1) {
        logger.critical(`Found multiple values with global value key ${gvKey}!`);
        return null;
    }

    return valuesFound[0];
};

export const getGlobalValueSet = (contentId?: string): GlobalValueContentTypes | null => {
    if (!contentId) {
        return null;
    }

    const content = contentLib.get({ key: contentId });
    if (!content || !isGlobalValueSetType(content)) {
        return null;
    }

    return content;
};

export const getGlobalNumberValue = (gvKey: string, contentId: string) => {
    const content = getGlobalValueSet(contentId);
    if (!content || content.type !== 'no.nav.navno:global-value-set') {
        logger.info(`No global number value set found for contentId ${contentId}`);
        return null;
    }

    const valueItem = getGlobalValueItem(gvKey, content);
    if (!valueItem) {
        logger.info(`No value found for key ${gvKey} on content ${contentId}`);
        return null;
    }

    return (valueItem as GlobalNumberValueItem).numberValue;
};

export const getGlobalCaseTime = (gvKey: string, contentId: string) => {
    const content = getGlobalValueSet(contentId);
    if (!content || content.type !== 'no.nav.navno:global-case-time-set') {
        logger.info(`No global case time set found for contentId ${contentId}`);
        return null;
    }

    const valueItem = getGlobalValueItem(gvKey, content);
    if (!valueItem) {
        logger.info(`No value found for key ${gvKey} on content ${contentId}`);
        return null;
    }

    return valueItem as CaseTimeItem;
};
