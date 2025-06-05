import { Request, Response } from '@enonic-types/core';
import { getLayersData, isValidLocale } from 'lib/localization/layers-data';
import { getRepoConnection } from 'lib/repos/repo-utils';

// Note: This assumes a content will only have 0 or 1 attachments.
// A content could have multiple attachments, if we used the AttachmentUploader input type in any of our content types.
// We don't use this atm, and it's unlikely we will in the forseeable future. But if we do, implement accordingly :D
export const externalArchiveAttachmentService = (req: Request): Response => {
    const id = req.params.id as string;
    const versionId = req.params.versionId as string;
    const locale = req.params.locale as string;

    if (!id || !locale || !versionId) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                msg: 'Parameters id, versionId and locale are required',
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
        headers: {
            'Content-Disposition': `attachment; filename="${attachment.name}"`,
        },
    };
};
