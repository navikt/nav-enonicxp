import { getServiceRequestSubPath } from '../service-utils';
import { externalArchiveContentTreeService } from './contentTree/contentTree';
import { externalArchiveContentService } from './content/content';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { externalArchiveContentIconService } from './contentIcon/contentIcon';
import { externalArchiveAttachmentService } from './attachment/attachment';

const getRequestHandler = (req: XP.Request) => {
    const subPath = getServiceRequestSubPath(req);

    switch (subPath) {
        case 'contentTree':
            return externalArchiveContentTreeService;
        case 'content':
            return externalArchiveContentService;
        case 'contentIcon':
            return externalArchiveContentIconService;
        case 'attachment':
            return externalArchiveAttachmentService;
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
