import contentLib from '/lib/xp/content';
import { sendReliableEvent } from '../../lib/events/reliable-custom-events';
import { cacheInvalidateEventName } from '../../lib/cache/cache-invalidate';
import { NodeEventData } from '../../lib/cache/utils';
import { contentRepoDefault } from '../../lib/constants';
import { logger } from '../../lib/utils/logging';

export const get = (req: XP.Request) => {
    const { contentId } = req.params;

    if (!contentId) {
        const msg = 'No contentId specified for cache invalidate service';
        logger.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    const content = contentLib.get({ key: contentId });

    if (!content) {
        const msg = `No content found for id ${contentId}`;
        logger.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    sendReliableEvent<NodeEventData>({
        type: cacheInvalidateEventName,
        data: { id: content._id, path: content._path, branch: 'master', repo: contentRepoDefault },
    });

    logger.info(`Manually triggered cache invalidation for ${content._path}`);

    return { status: 204 };
};
