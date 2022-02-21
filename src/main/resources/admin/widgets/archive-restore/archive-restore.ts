import thymeleafLib from '/lib/thymeleaf';
import { urls } from '../../../lib/constants';
import { validateCurrentUserPermissionForContent } from '../../../lib/utils/auth-utils';
import { getSubPath } from '../../../services/service-utils';
import { archiveQueryResponse } from './query/archive-query-response';
import { archiveRestoreResponse } from './restore/archive-restore-response';

const view = resolve('./archive-restore.html');

const widgetResponse = (req: XP.Request) => {
    const { contextPath } = req;
    const { contentId } = req.params;

    const widgetUrl = `${urls.portalAdminOrigin}${contextPath}`;
    const queryUrl = `${widgetUrl}/query`;
    const restoreUrl = `${widgetUrl}/restore`;

    if (!contentId) {
        return {
            body: '<widget>Ukjent feil - forsøk å laste inn på nytt</widget>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

    if (!validateCurrentUserPermissionForContent(contentId, 'PUBLISH')) {
        return {
            body: '<widget>Tilgangsfeil - Velg en mappe der du har publiseringstilgang.</widget>',
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

export const get = (req: XP.Request) => {
    const subPath = getSubPath(req);

    log.info(`Sub path: ${subPath}`);

    if (subPath === 'query') {
        return archiveQueryResponse(req);
    }

    if (subPath === 'restore') {
        return archiveRestoreResponse(req);
    }

    return widgetResponse(req);
};
