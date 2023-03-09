import * as contentLib from '/lib/xp/content';

type ResponseBody = {
    message: string;
    result: 'success' | 'error';
};

export const migrateContentToLayerWidgetHandler = (req: XP.Request): XP.Response<ResponseBody> => {
    const { contentId, targetLocale, targetContentId: targetContentIdInput } = req.params;

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

    return {
        body: {
            message: `Valgt locale: ${targetLocale} - Valgt contentId: ${targetContentId}`,
            result: 'success',
        },
        contentType: 'application/json',
    };
};
