import contentLib from '/lib/xp/content';
import { sendReliableEvent } from '../../lib/events/reliable-custom-events';
import { cacheInvalidateEventName } from '../../lib/siteCache/cache-invalidate';

export const get = (req: XP.Request) => {
    const { contentId } = req.params;

    if (!contentId) {
        const msg = 'No contentId specified for cache invalidate service';
        log.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    const content = contentLib.get({ key: contentId });

    if (!content) {
        const msg = `No content found for id ${contentId}`;
        log.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    sendReliableEvent({
        type: cacheInvalidateEventName,
        data: { id: content._id, path: content._path },
    });

    log.info(`Manually triggered cache invalidation for ${content._path}`);

    return { status: 204 };
};
