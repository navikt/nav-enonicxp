const { getSubPath } = require('../service-utils');
const { getGlobalValueSetService } = require('./getSet/getSet');
const { removeGlobalValueItem } = require('./remove/remove');
const { modifyGlobalValueItem } = require('./modify/modify');
const { addGlobalValueItem } = require('./add/add');
const { getGlobalValueUsageService } = require('./usage/usage');
const { getAllGlobalValues } = require('/lib/global-values/global-values');

const selectorHandler = (req) => {
    const { valueType = 'textValue', query } = req.params;

    const wordsWithWildcard = query
        ?.split(' ')
        .map((word) => `${word}*`)
        .join(' ');

    const values = getAllGlobalValues(valueType, wordsWithWildcard);

    const hits = values
        .map((value) => ({
            id: value.key,
            displayName: `${value.itemName} - ${value.setName}`,
            description: `Verdi: ${value[valueType]}`,
        }))
        .flat();

    log.info(`Hits: ${JSON.stringify(hits)}`);

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
    log.info(JSON.stringify(req));

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
