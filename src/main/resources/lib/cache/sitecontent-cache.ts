import cacheLib from '/lib/cache';

const oneWeek = 60 * 60 * 24 * 7;

const cache = cacheLib.newCache({ size: 10000, expire: oneWeek });

const getCacheKey = (contentId: string, cacheVersionKey: string) =>
    `${contentId}_${cacheVersionKey}`;

export const getContentFromCache = (
    contentId: string,
    cacheVersionKey: string,
    callback: () => any
) => {
    const cacheKey = getCacheKey(contentId, cacheVersionKey);
    log.info(`Getting content cached with key ${cacheKey}`);
    try {
        return cache.get(cacheKey, callback);
    } catch (e) {
        // cache.get throws if callback returns null
        log.info(`Could not get cache for ${cacheKey} - ${e}`);
        return null;
    }
};
