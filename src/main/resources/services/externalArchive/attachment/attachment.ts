import { getLayersData, isValidLocale } from '../../../lib/localization/layers-data';
import { getRepoConnection } from '../../../lib/utils/repo-utils';

export const externalArchiveAttachmentService = (req: XP.Request) => {
    const { id, versionId, locale } = req.params;

    if (!id || !locale || !versionId) {
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

    const repo = getRepoConnection({
        branch: 'draft',
        repoId: getLayersData().localeToRepoIdMap[locale],
        asAdmin: true,
    });

    const content = repo.get({ key: id, versionId });
    if (!content) {
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                msg: `Content not found for ${id}/${locale}/${versionId}`,
            },
        };
    }

    const { attachment } = content;
    if (!attachment) {
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                msg: `Content on ${id}/${locale}/${versionId} does not have an attachment`,
            },
        };
    }

    const binary = repo.getBinary({ key: id, binaryReference: attachment.binary });
    if (!binary) {
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                msg: `Failed to fetch binary from ${id}/${locale}/${versionId}`,
            },
        };
    }

    return {
        status: 200,
        contentType: attachment.mimeType,
        body: binary,
    };
};
