export const migrateContentToLayerWidgetHandler = (req: XP.Request) => {
    const { contentId, targetLocale, targetContentId } = req.params;

    if (!targetLocale || !targetContentId) {
        return {
            body: `<widget>Velg et </widget>`,
            contentType: 'text/html; charset=UTF-8',
        };
    }

    return {
        body: `<widget>Valgt locale: ${targetLocale} - Valgt contentId: ${targetContentId}</widget>`,
        contentType: 'text/html; charset=UTF-8',
    };
};
