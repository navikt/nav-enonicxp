import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import thymeleafLib from '/lib/thymeleaf';
import { validateCurrentUserPermissionForContent } from '../../../lib/utils/auth-utils';
import {
    APP_DESCRIPTOR,
    CONTENT_LOCALE_DEFAULT,
    CONTENT_ROOT_REPO_ID,
    URLS,
} from '../../../lib/constants';
import { getLayersData } from '../../../lib/localization/layers-data';
import { getServiceRequestSubPath } from '../../../services/service-utils';
import { migrateContentToLayerWidgetHandler } from './migrate-handler/migrate-handler';
import { batchedContentQuery } from '../../../lib/utils/batched-query';

const view = resolve('./migrate-to-layer.html');

const MIGRATE_HANDLER_PATH = 'migrate-handler';

const getTargetOptions = (content: Content) => {
    const options = batchedContentQuery({
        count: 5000,
        contentTypes: [content.type],
        filters: {
            boolean: {
                mustNot: [
                    {
                        ids: { values: [content._id] },
                    },
                ],
            },
        },
    }).hits.map((hit) => ({ id: hit._id, text: `${hit.displayName} [${hit._path}]` }));

    return options;
};

const isApplicableContentType = (content: Content) =>
    content.type.startsWith(APP_DESCRIPTOR) || content.type === 'portal:fragment';

export const widgetResponse = (req: XP.Request) => {
    const { repositoryId, contextPath } = req;
    const { contentId } = req.params;

    if (!contentId) {
        return {
            body: '<widget>Ukjent feil 1 - forsøk å laste inn editoren på nytt (F5)</widget>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

    const content = contentLib.get({ key: contentId });
    if (!content) {
        return {
            body: '<widget>Fant ikke innholdet. Kanskje det allerede er migrert?</widget>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

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

    if (!isApplicableContentType(content)) {
        return {
            body: `<widget>Denne widgeten er ikke tilgjengelig for innholdstypen "${content.type}"</widget>`,
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

    const targetOptions = getTargetOptions(content);

    const model = {
        locales: nonDefaultLocales,
        sourceId: contentId,
        targetOptions,
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
