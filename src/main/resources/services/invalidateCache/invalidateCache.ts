import * as contentLib from '/lib/xp/content';
import { sendReliableEvent } from '../../lib/events/reliable-custom-events';
import { CACHE_INVALIDATE_EVENT_NAME } from '../../lib/cache/cache-invalidate';
import { NodeEventData } from '../../lib/cache/utils';
import { logger } from '../../lib/utils/logging';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { getLayersData } from '../../lib/localization/layers-data';

export const get = (req: XP.Request) => {
    const { contentId, locale } = req.params;

    if (!contentId) {
        const msg = 'No contentId specified for cache invalidate service';
        logger.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    if (!locale) {
        const msg = 'No locale specified for cache invalidate service';
        logger.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    const content = runInLocaleContext({ locale }, () => contentLib.get({ key: contentId }));
    if (!content) {
        const msg = `No content found for id ${contentId}`;
        logger.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    const { localeToRepoIdMap } = getLayersData();

    sendReliableEvent<NodeEventData>({
        type: CACHE_INVALIDATE_EVENT_NAME,
        data: {
            id: content._id,
            path: content._path,
            branch: 'master',
            repo: localeToRepoIdMap[locale],
        },
    });

    logger.info(`Manually triggered cache invalidation for ${content._path}`);

    return { status: 204 };
};
