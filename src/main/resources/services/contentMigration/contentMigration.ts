import { getServiceRequestSubPath } from '../service-utils';
import { startPageMetaCreation } from './migrateMetaData/migrateMetaData';
import { migrateContentToV2 } from './migrateContentToV2/migrateContentToV2';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { getLayersData } from '../../lib/localization/layers-data';

const getServiceFunction = (req: XP.Request): any => {
    const subPath = getServiceRequestSubPath(req);

    if (!subPath) {
        return null;
    }

    switch (subPath) {
        case 'migrateContentToV2':
            return startPageMetaCreation;
        case 'migrateMetaData':
            return migrateContentToV2;
        default:
            return null;
    }
};

export const get = (req: XP.Request) => {
    const serviceFunction = getServiceFunction(req);

    if (!getServiceFunction) {
        return {
            status: 404,
            contentType: 'application/json',
        };
    }

    const params = req.params;

    serviceFunction(params);
    // Global values should always use the default layer

    return {
        status: 200,
        contentType: 'application/json',
        body: {},
    };
};
