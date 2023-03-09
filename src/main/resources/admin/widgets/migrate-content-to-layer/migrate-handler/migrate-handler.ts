import * as contentLib from '/lib/xp/content';
import { migrateRootContentToLayer } from '../../../../lib/localization/migration/migrate-root-content-to-layer';
import { logger } from '../../../../lib/utils/logging';
import { CONTENT_LOCALE_DEFAULT } from '../../../../lib/constants';

type ResponseBody = {
    message: string;
    result: 'success' | 'error';
};

export const migrateContentToLayerWidgetHandler = (req: XP.Request): XP.Response<ResponseBody> => {
    const { sourceId: sourceContentId, targetLocale, targetId: targetContentIdInput } = req.params;

    if (!targetLocale) {
        return {
            body: { message: `Feil: språk-layer må være valgt`, result: 'success' },
            contentType: 'application/json',
        };
    }

    if (!targetContentIdInput) {
        return {
            body: {
                message: `Feil: contentId må være valgt. Dette skal være det samme som den norske versjonen av innholdet`,
                result: 'error',
            },
            contentType: 'application/json',
        };
    }

    // This should always be set programatically as a hidden input
    if (!sourceContentId) {
        return {
            body: {
                message: `Noe gikk galt. Forsøk å laste inn editoren på nytt (F5) og prøv igjen.`,
                result: 'error',
            },
            contentType: 'application/json',
        };
    }

    const targetContentId = targetContentIdInput.replace(/"/g, '').trim();
    const targetContent = contentLib.get({ key: targetContentId });

    if (!targetContent) {
        return {
            body: {
                message: `Feil: valgt contentId "${targetContentId}" er ikke gyldig. Velg Content Viewer i det norske innholdet og kopier _id verdien.`,
                result: 'error',
            },
            contentType: 'application/json',
        };
    }

    const migrationResult = migrateRootContentToLayer({
        sourceContentId,
        sourceLocale: CONTENT_LOCALE_DEFAULT,
        targetContentId,
        targetLocale,
    });

    logger.info(`Migration result: ${JSON.stringify(migrationResult)}`);

    return {
        body: {
            message: `Valgt locale: ${targetLocale} - Valgt contentId: ${targetContentId}`,
            result: 'success',
        },
        contentType: 'application/json',
    };
};
