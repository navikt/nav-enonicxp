import thymeleafLib from '/lib/thymeleaf';
import { validateCurrentUserPermissionForContent } from '../../../lib/utils/auth-utils';
import { CONTENT_LOCALE_DEFAULT, CONTENT_ROOT_REPO_ID, URLS } from '../../../lib/constants';
import { getLayersData } from '../../../lib/localization/layers-data';
import { getServiceRequestSubPath } from '../../../services/service-utils';
import { migrateContentToLayerWidgetHandler } from './migrate-handler/migrate-handler';

const view = resolve('./migrate-content-to-layer.html');

const MIGRATE_HANDLER_PATH = 'migrate-handler';

export const widgetResponse = (req: XP.Request) => {
    const { repositoryId, contextPath } = req;
    const { contentId } = req.params;

    if (!validateCurrentUserPermissionForContent(contentId, 'PUBLISH')) {
        return {
            body: '<widget>Tilgangsfeil - Du må ha publiseringstilgang for å flytte dette innholdet til et layer</widget>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

    if (repositoryId !== CONTENT_ROOT_REPO_ID) {
        return {
            body: `<widget>Denne widgeten er kun tilgjengelig i layeret for default-språket (${CONTENT_LOCALE_DEFAULT})</widget>`,
            contentType: 'text/html; charset=UTF-8',
        };
    }

    const migrateHandlerUrl = `${URLS.PORTAL_ADMIN_ORIGIN}${contextPath}/${MIGRATE_HANDLER_PATH}`;

    const nonDefaultLocales = getLayersData().locales.filter(
        (locale) => locale !== CONTENT_LOCALE_DEFAULT
    );

    if (nonDefaultLocales.length === 0) {
        return {
            body: `<widget>Denne widgeten kan kun benyttes etter innføring av layers (kommer snart!)</widget>`,
            contentType: 'text/html; charset=UTF-8',
        };
    }

    const model = {
        locales: nonDefaultLocales,
        sourceId: contentId,
        migrateHandlerUrl,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html; charset=UTF-8',
    };
};

export const get = (req: XP.Request) => {
    const subPath = getServiceRequestSubPath(req);

    if (subPath === MIGRATE_HANDLER_PATH) {
        return migrateContentToLayerWidgetHandler(req);
    }

    return widgetResponse(req);
};
