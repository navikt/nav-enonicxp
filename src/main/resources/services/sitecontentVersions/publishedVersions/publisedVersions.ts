import { isUUID } from '../../../lib/utils/uuid';
import { getPublishedVersionTimestamps } from '../../../lib/utils/version-utils';
import { logger } from '../../../lib/utils/logging';

export const publishedVersionsReqHandler = (req: XP.Request) => {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
        return {
            status: 400,
            body: {
                message: 'No valid id parameter was provided',
            },
            contentType: 'application/json',
        };
    }

    try {
        return {
            status: 200,
            contentType: 'application/json',
            body: getPublishedVersionTimestamps(id),
        };
    } catch (e) {
        logger.error(`Error while retrieving published version timestamps - ${e}`);

        return {
            status: 500,
            contentType: 'application/json',
            body: { msg: `Server error: ${e}` },
        };
    }
};
