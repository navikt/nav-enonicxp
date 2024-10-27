import { getServiceRequestSubPath } from '../service-utils';
import { externalArchiveContentTreeGet } from './contentTree/contentTree';
import { externalArchiveContentGet } from './content/content';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { externalArchiveContentIconGet } from './contentIcon/contentIcon';

const getRequestHandler = (req: XP.Request) => {
    const subPath = getServiceRequestSubPath(req);

    switch (subPath) {
        case 'contentTree':
            return externalArchiveContentTreeGet;
        case 'content':
            return externalArchiveContentGet;
        case 'contentIcon':
            return externalArchiveContentIconGet;
        default:
            return null;
    }
};

export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
        };
    }

    const reqHandler = getRequestHandler(req);

    if (!reqHandler) {
        return {
            status: 404,
            contentType: 'application/json',
        };
    }

    return reqHandler(req);
};
