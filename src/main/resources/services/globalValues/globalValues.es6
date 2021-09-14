const { runInBranchContext } = require('/lib/headless/branch-context');
const { getSubPath } = require('../service-utils');
const { getGlobalValueSetService } = require('./getSet/getSet');
const { removeGlobalValueItem } = require('./remove/remove');
const { modifyGlobalValueItem } = require('./modify/modify');
const { addGlobalValueItem } = require('./add/add');
const { getGlobalValueUsageService } = require('./usage/usage');
const { getAllGlobalValues } = require('/lib/global-values/global-values');

const selectorHandler = (req) => {
    const { valueType = 'textValue', withDescription, query } = req.params;

    const wordsWithWildcard = query
        ?.split(' ')
        .map((word) => `${word}*`)
        .join(' ');

    const values = runInBranchContext(
        () => getAllGlobalValues(valueType, wordsWithWildcard),
        'master'
    );

    const hits = values
        .map((value) => {
            const displayName = `${value.setName} - ${value.itemName}`;

            return {
                id: withDescription
                    ? appendMacroDescriptionToKey(value.key, displayName)
                    : value.key,
                displayName,
                description: `Verdi: ${value[valueType]}`,
            };
        })
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
