import { getServiceRequestSubPath } from '../service-utils';
import { globalValueSelectorService } from './selector/selector';
import { getGlobalValueSetService } from './getSet/getSet';
import { getGlobalValueUsageService } from './usage/usage';
import { modifyGlobalValueItemService } from './modify/modify';
import { removeGlobalValueItemService } from './remove/remove';
import { addGlobalValueItemService } from './add/add';
import { reorderGlobalValuesService } from './reorderValues/reorderGlobalValuesService';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { getLayersData } from '../../lib/localization/layers-data';

const getRequestHandler = (req: XP.Request) => {
    const subPath = getServiceRequestSubPath(req);

    if (!subPath) {
        return globalValueSelectorService;
    }

    switch (subPath) {
        case 'getValueSet':
            return getGlobalValueSetService;
        case 'usage':
            return getGlobalValueUsageService;
        case 'add':
            return addGlobalValueItemService;
        case 'modify':
            return modifyGlobalValueItemService;
        case 'remove':
            return removeGlobalValueItemService;
        case 'reorder':
            return reorderGlobalValuesService;
        default:
            return null;
    }
};

export const get = (req: XP.Request) => {
    const reqHandler = getRequestHandler(req);

    if (!reqHandler) {
        return {
            status: 404,
            contentType: 'application/json',
        };
    }

    const { defaultLocale } = getLayersData();

    // Global values should always use the default layer
    return runInLocaleContext({ locale: defaultLocale }, () => reqHandler(req));
};
