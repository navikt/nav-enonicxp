import { Request, Response } from '@enonic-types/core'
import * as contentLib from '/lib/xp/content';
import { migrateContentToLayer } from '../../../../lib/localization/layers-migration/migrate-content-to-layer';
import { CONTENT_LOCALE_DEFAULT } from '../../../../lib/constants';

export const migrateContentToLayerWidgetHandler = (req: Request) : Response => {
    const sourceId = req.params.sourceId as string;
    const targetLocale = req.params.targetLocale as string;
    const targetId = req.params.targetId as string;

    if (!targetLocale) {
        return {
            body: { message: `Feil: språk-layer må være valgt`, result: 'success' },
            contentType: 'application/json',
        };
    }

    if (!targetId) {
        return {
            body: {
                message: `Feil: Target contentId må være valgt. Dette skal være det samme som det norske versjonen av innholdet`,
                result: 'error',
            },
            contentType: 'application/json',
        };
    }

    // This should always be set programatically as a hidden input
    if (!sourceId) {
        return {
            body: {
                message: `Noe gikk galt. Forsøk å laste inn editoren på nytt (F5) og prøv igjen.`,
                result: 'error',
            },
            contentType: 'application/json',
        };
    }

    const targetContentId = targetId.replace(/"/g, '').trim();
    const targetContent = contentLib.get({ key: targetContentId });
    if (!targetContent) {
        return {
            body: {
                message: `Feil: valgt targetContentId "${targetContentId}" er ikke gyldig. Velg Content Viewer i det norske innholdet og kopier _id verdien.`,
                result: 'error',
            },
            contentType: 'application/json',
        };
    }

    const { errorMsgs, statusMsgs } = migrateContentToLayer({
        sourceId,
        sourceLocale: CONTENT_LOCALE_DEFAULT,
        targetId: targetContentId,
        targetLocale,
    });

    return {
        body: {
            message: [...statusMsgs, ...errorMsgs].join('\n'),
            result: errorMsgs.length > 0 ? 'error' : 'success',
        },
        contentType: 'application/json',
    };
};
