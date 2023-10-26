import { getServiceRequestSubPath } from '../service-utils';
import { startPageMetaCreation } from './migrateMetaData/migrateMetaData';
import { migrateContentToV2 } from './migrateContentToV2/migrateContentToV2';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';

const getServiceFn = (req: XP.Request): any => {
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
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const fn = getServiceFn(req);

    if (!fn) {
        return {
            status: 404,
            contentType: 'application/json',
        };
    }

    const { params } = req;
    fn(params);

    return {
        status: 200,
        contentType: 'application/json',
        body: {},
    };
};
