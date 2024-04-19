import cacheLib from '/lib/cache';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { Content } from '/lib/xp/content';
import { CONTENT_ROOT_REPO_ID, NAVNO_NODE_ROOT_PATH } from '../constants';
import { EnonicEvent } from '/lib/xp/event';

const ONE_HOUR = 60 * 60;
const draftCache = cacheLib.newCache({ size: 2000, expire: ONE_HOUR });

export const getFromDraftCache = <Type>(
    contentId: string,
    locale: string,
    callback: () => Type
) => {
    const { localeToRepoIdMap } = getLayersData();

    // The cache should only be valid for the current content version
    const cacheKey = getRepoConnection({
        repoId: localeToRepoIdMap[locale] || CONTENT_ROOT_REPO_ID,
        branch: 'draft',
        asAdmin: true,
    }).get<Content>(contentId)!._versionKey;

    try {
        return draftCache.get(cacheKey, callback);
    } catch (e) {
        logger.warning(`Error while resolving draft content for ${contentId} / ${locale} - ${e}`);
        return null;
    }
};

export const draftCacheInvalidateOnUpdateEvent = (event: EnonicEvent) => {
    event.data.nodes.forEach((node) => {
        if (node.branch !== 'draft') {
            return;
        }

        if (!node.path.startsWith(NAVNO_NODE_ROOT_PATH)) {
            return;
        }

        logger.info(`Clearing draft cache for event ${JSON.stringify(event)}`);
        draftCache.clear();
    });
};
