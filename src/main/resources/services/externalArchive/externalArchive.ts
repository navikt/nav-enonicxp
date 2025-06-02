import { Request } from '@enonic-types/core';
import { validateServiceSecretHeader } from 'lib/utils/auth-utils';
import { getServiceRequestSubPath } from '../service-utils';
import { externalArchiveContentTreeService } from './contentTree/contentTree';
import { externalArchiveContentService } from './content/content';
import { externalArchiveContentIconService } from './contentIcon/contentIcon';
import { externalArchiveAttachmentService } from './attachment/attachment';
import { externalArchiveSearchService } from './search/search';

const getRequestHandler = (req: Request) => {
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
        case 'search':
            return externalArchiveSearchService;
        default:
            return null;
    }
};

export const get = (req: Request) => {
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
