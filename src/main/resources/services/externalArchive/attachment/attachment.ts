import { isValidLocale } from '../../../lib/localization/layers-data';
import { getContentForExternalArchive } from '../../../lib/external-archive/content';

export const externalArchiveAttachmentService = (req: XP.Request) => {
    const { id, versionId, locale } = req.params;

    if (!id || !locale) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                msg: 'Parameters id and locale are required',
            },
        };
    }

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                msg: `Invalid locale specified: ${locale}`,
            },
        };
    }

    const content = getContentForExternalArchive({ contentId: id, versionId, locale });

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            content,
        },
    };
};
