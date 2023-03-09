import thymeleafLib from '/lib/thymeleaf';
import { validateCurrentUserPermissionForContent } from '../../../lib/utils/auth-utils';
import { CONTENT_LOCALE_DEFAULT, CONTENT_ROOT_REPO_ID, URLS } from '../../../lib/constants';
import { getLayersData } from '../../../lib/localization/layers-data';
import { logger } from '../../../lib/utils/logging';
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
            body: `<widget>Denne widgeten kan bare brukes i layeret for default-språket (${CONTENT_LOCALE_DEFAULT})</widget>`,
            contentType: 'text/html; charset=UTF-8',
        };
    }

    const migrateHandlerUrl = `${URLS.PORTAL_ADMIN_ORIGIN}${contextPath}/${MIGRATE_HANDLER_PATH}`;

    const locales = Object.keys(getLayersData().localeToRepoIdMap).filter(
        (locale) => locale !== CONTENT_LOCALE_DEFAULT
    );

    const model = {
        locales,
        sourceId: contentId,
        migrateHandlerUrl,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};

export const get = (req: XP.Request) => {
    const { repositoryId, contextPath } = req;

    logger.info(
        `params: ${JSON.stringify(
            req.params
        )} - repoId: ${repositoryId} - contextPath: ${contextPath}`
    );

    const subPath = getServiceRequestSubPath(req);

    if (subPath === MIGRATE_HANDLER_PATH) {
        return migrateContentToLayerWidgetHandler(req);
    }

    return widgetResponse(req);
};
