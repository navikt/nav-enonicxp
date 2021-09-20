const { getMacroKeyForGlobalValue } = require('/lib/global-values/global-values');
const { getValueKeyAndcontentIdFromMacroKey } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');
const { appendMacroDescriptionToKey } = require('/lib/headless/component-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getSubPath } = require('../service-utils');
const { getGlobalValueSetService } = require('./getSet/getSet');
const { removeGlobalValueItem } = require('./remove/remove');
const { modifyGlobalValueItem } = require('./modify/modify');
const { addGlobalValueItem } = require('./add/add');
const { getGlobalValueUsageService } = require('./usage/usage');
const { getAllGlobalValues } = require('/lib/global-values/global-values');

const hitFromValueItem = (valueItem, valueType, withDescription) => {
    const displayName = `${valueItem.setName} - ${valueItem.itemName}`;
    const macroKey = getMacroKeyForGlobalValue(valueItem.key, valueItem.contentId);

    return {
        id: withDescription ? appendMacroDescriptionToKey(macroKey, displayName) : macroKey,
        displayName,
        description: `Verdi: ${valueItem[valueType]}`,
    };
};

const selectorHandler = (req) => {
    const { valueType = 'textValue', withDescription, query, ids } = req.params;

    const wordsWithWildcard = query
        ?.split(' ')
        .map((word) => `${word}*`)
        .join(' ');

    const values = runInBranchContext(
        () => getAllGlobalValues(valueType, wordsWithWildcard),
        'master'
    );

    if (ids) {
        const hits = forceArray(ids).reduce((acc, id) => {
            const { valueKey, contentId } = getValueKeyAndcontentIdFromMacroKey(id);
            const valueItem = values.find(
                (value) => value.key === valueKey && value.contentId === contentId
            );

            if (!valueItem) {
                return acc;
            }

            return [
                ...acc,
                {
                    ...hitFromValueItem(valueItem, valueType, false),
                    id,
                },
            ];
        }, []);

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                total: hits.length,
                count: hits.length,
                hits: hits,
            },
        };
    }

    const hits = values
        .map((value) => hitFromValueItem(value, valueType, withDescription))
        .flat()
        .sort((a, b) => {
            if (a.displayName > b.displayName) {
                return 1;
            }
            if (a.displayName < b.displayName) {
                return -1;
            }
            return 0;
        });

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            total: hits.length,
            count: hits.length,
            hits: hits,
        },
    };
};

const globalValues = (req) => {
    const subPath = getSubPath(req);

    if (!subPath) {
        return selectorHandler(req);
    }

    switch (subPath) {
        case 'getValueSet':
            return getGlobalValueSetService(req);
        case 'usage':
            return getGlobalValueUsageService(req);
        case 'add':
            return addGlobalValueItem(req);
        case 'modify':
            return modifyGlobalValueItem(req);
        case 'remove':
            return removeGlobalValueItem(req);
        default:
            break;
    }

    return {
        status: 404,
        contentType: 'application/json',
    };
};

exports.get = globalValues;
