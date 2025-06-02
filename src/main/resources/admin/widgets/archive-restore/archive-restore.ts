import { Request } from '@enonic-types/core'
import thymeleafLib from '/lib/thymeleaf';
import { URLS } from 'lib/constants';
import { forceString } from 'lib/utils/string-utils';
import { validateCurrentUserPermissionForContent } from 'lib/utils/auth-utils';
import { getServiceRequestSubPath } from 'services/service-utils';
import { archiveQueryResponse } from './query/archive-query-response';
import { archiveRestoreResponse } from './restore/archive-restore-response';

const view = resolve('./archive-restore.html');

const QUERY_PATH = 'query';
const RESTORE_PATH = 'restore';

const widgetResponse = (req: Request) => {
    const { contextPath } = req;
    const { contentId } = req.params;

    const widgetUrl = `${URLS.PORTAL_ADMIN_ORIGIN}${contextPath}`;
    const queryUrl = `${widgetUrl}/${QUERY_PATH}`;
    const restoreUrl = `${widgetUrl}/${RESTORE_PATH}`;

    if (!contentId) {
        return {
            body: '<widget>Velg et innhold som mål for gjenoppretting fra arkivet</widget>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

    if (!validateCurrentUserPermissionForContent(forceString(contentId), 'PUBLISH')) {
        return {
            body: '<widget>Tilgangsfeil - Velg et innhold der du har publiseringstilgang.</widget>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

    const model = {
        queryUrl,
        restoreUrl,
        contentId,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html; charset=UTF-8',
    };
};

export const get = (req: Request) => {
    const subPath = getServiceRequestSubPath(req);

    if (subPath === QUERY_PATH) {
        return archiveQueryResponse(req);
    }

    if (subPath === RESTORE_PATH) {
        return archiveRestoreResponse(req);
    }

    return widgetResponse(req);
};
