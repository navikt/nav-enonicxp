const { reorderValues } = require('./reorderValues/reorderValues');
const { getSubPath } = require('../service-utils');
const { getGlobalValueSetService } = require('./getSet/getSet');
const { removeGlobalValueItemService } = require('./remove/remove');
const { modifyGlobalValueItemService } = require('./modify/modify');
const { addGlobalValueItemService } = require('./add/add');
const { getGlobalValueUsageService } = require('./usage/usage');
const { globalValueSelectorService } = require('./selector/selector');

const globalValues = (req) => {
    const subPath = getSubPath(req);

    if (!subPath) {
        return globalValueSelectorService(req);
    }

    switch (subPath) {
        case 'getValueSet':
            return getGlobalValueSetService(req);
        case 'usage':
            return getGlobalValueUsageService(req);
        case 'add':
            return addGlobalValueItemService(req);
        case 'modify':
            return modifyGlobalValueItemService(req);
        case 'remove':
            return removeGlobalValueItemService(req);
        case 'reorder':
            return reorderValues(req);
        default:
            break;
    }

    return {
        status: 404,
        contentType: 'application/json',
    };
};

exports.get = globalValues;
