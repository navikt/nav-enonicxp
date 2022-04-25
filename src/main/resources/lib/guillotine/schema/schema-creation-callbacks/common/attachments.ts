import contentLib, { Attachment } from '/lib/xp/content';
import ioLib from '/lib/xp/io';

type GuillotineAttachment = Attachment & { __nodeId: string };

const maxSizeDefault = 100000;

export const getAttachmentText = (attachment: GuillotineAttachment, maxSize = maxSizeDefault) => {
    if (!attachment) {
        log.warning(`No attachment object was provided`);
        return null;
    }

    const { __nodeId: id, name, mimeType, size } = attachment;

    if (!id || !name) {
        log.warning(`Id or name for attachment not found - got id ${id} and name ${name}`);
        return null;
    }

    if (size > maxSize) {
        log.warning(`Max size exceeded for attachment - id ${id} - name ${name}`);
        return null;
    }

    const attachmentStream = contentLib.getAttachmentStream({ key: id, name: name });
    if (!attachmentStream) {
        log.warning(`No attachment stream found for ${id} ${name}`);
        return null;
    }

    const attachmentText = ioLib.readText(attachmentStream);
    if (!attachmentText) {
        log.warning(`No attachment text found for ${id} ${name}`);
        return null;
    }

    if (mimeType === 'application/json') {
        try {
            return JSON.parse(attachmentText);
        } catch (e) {
            log.warning(
                `JSON parse error for attachment id ${id} / name ${name} - returning string as-is - Error: ${e}`
            );
            return attachmentText;
        }
    }

    if (!mimeType.startsWith('text')) {
        log.warning(
            `Text data was requested for attachment ${name} on ${id} - got data of type ${mimeType}. Return-value may be incorrectly encoded.`
        );
    }

    return attachmentText;
};
