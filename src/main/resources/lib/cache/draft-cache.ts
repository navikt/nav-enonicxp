import cacheLib from '/lib/cache';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { Content } from '/lib/xp/content';
import { CONTENT_ROOT_REPO_ID, NAVNO_NODE_ROOT_PATH } from '../constants';
import { EnonicEvent } from '/lib/xp/event';

const ONE_HOUR = 60 * 60;
const draftCache = cacheLib.newCache({ size: 1000, expire: ONE_HOUR });

export const getFromDraftCache = <Type>(
    contentId: string,
    locale: string,
    callback: () => Type
): Type | null => {
    // The cache should only be valid for the current content version
    const cacheKey = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale] || CONTENT_ROOT_REPO_ID,
        branch: 'draft',
        asAdmin: true,
    }).get<Content>(contentId)!._versionKey;

    const resultFromCache = draftCache.getIfPresent<Type>(cacheKey);
    if (resultFromCache) {
        return resultFromCache;
    }

    const result = callback();
    if (!result) {
        return null;
    }

    draftCache.put(cacheKey, result);

    return result;
};

export const draftCacheClearOnUpdate = (event: EnonicEvent) => {
    event.data.nodes.forEach((node) => {
        if (node.branch !== 'draft') {
            return;
        }

        if (!node.path.startsWith(NAVNO_NODE_ROOT_PATH)) {
            return;
        }

        draftCache.clear();
    });
};
