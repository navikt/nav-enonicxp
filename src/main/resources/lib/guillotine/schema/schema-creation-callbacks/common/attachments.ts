import contentLib, { Attachment } from '/lib/xp/content';
import * as ioLib from '/lib/xp/io';
import { logger } from '../../../../utils/logging';

type GuillotineAttachment = Attachment & { __nodeId: string };

const maxSizeDefault = 100000;

export const getAttachmentText = (attachment: GuillotineAttachment, maxSize = maxSizeDefault) => {
    if (!attachment) {
        logger.warning(`No attachment object was provided`, false, true);
        return null;
    }

    const { __nodeId: id, name, mimeType, size } = attachment;

    if (!id || !name) {
        logger.warning(
            `Id or name for attachment not found - got id ${id} and name ${name}`,
            false,
            true
        );
        return null;
    }

    if (size > maxSize) {
        logger.warning(`Max size exceeded for attachment - id ${id} - name ${name}`, false, true);
        return null;
    }

    const attachmentStream = contentLib.getAttachmentStream({ key: id, name: name });
    if (!attachmentStream) {
        logger.warning(`No attachment stream found for ${id} ${name}`, false, true);
        return null;
    }

    const attachmentText = ioLib.readText(attachmentStream);
    if (!attachmentText) {
        logger.warning(`No attachment text found for ${id} ${name}`, false, true);
        return null;
    }

    if (mimeType === 'application/json') {
        try {
            return JSON.parse(attachmentText);
        } catch (e) {
            logger.warning(
                `JSON parse error for attachment id ${id} / name ${name} - returning string as-is - Error: ${e}`,
                false,
                true
            );
            return attachmentText;
        }
    }

    if (!mimeType.startsWith('text')) {
        logger.warning(
            `Text data was requested for attachment ${name} on ${id} - got data of type ${mimeType}. 
            Return-value may be incorrectly encoded.`,
            false,
            true
        );
    }

    return attachmentText;
};
