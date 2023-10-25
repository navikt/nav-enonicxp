import { getServiceRequestSubPath } from '../service-utils';
import { startPageMetaCreation } from './migrateMetaData/migrateMetaData';
import { migrateContentToV2 } from './migrateContentToV2/migrateContentToV2';

const getServiceFunction = (req: XP.Request): any => {
    const subPath = getServiceRequestSubPath(req);

    if (!subPath) {
        return null;
    }

    switch (subPath) {
        case 'migrateContentToV2':
            return migrateContentToV2;
        case 'migrateMetaData':
            return startPageMetaCreation;
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
