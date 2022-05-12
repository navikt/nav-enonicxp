import { getSubPath } from '../service-utils';
import { globalValueSelectorService } from './selector/selector';
import { getGlobalValueSetService } from './getSet/getSet';
import { getGlobalValueUsageService } from './usage/usage';
import { modifyGlobalValueItemService } from './modify/modify';
import { removeGlobalValueItemService } from './remove/remove';
import { addGlobalValueItemService } from './add/add';
import { reorderGlobalValuesService } from './reorder/reorder';

export const get = (req: XP.Request) => {
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
            return reorderGlobalValuesService(req);
        default:
            break;
    }

    return {
        status: 404,
        contentType: 'application/json',
    };
};
