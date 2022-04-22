import cacheLib from '/lib/cache';

const oneDay = 60 * 60 * 24;

const cache = cacheLib.newCache({ size: 10000, expire: oneDay });

const getCacheKey = (contentId: string, cacheVersionKey: string) =>
    `${contentId}_${cacheVersionKey}`;

export const getResponseFromCache = (
    contentId: string,
    callback: () => any,
    cacheVersionKey?: string
) => {
    // If no version key is provided, do not get from cache
    if (!cacheVersionKey) {
        return callback();
    }

    const cacheKey = getCacheKey(contentId, cacheVersionKey);

    try {
        return cache.get(cacheKey, callback);
    } catch (e) {
        // cache.get throws if callback returns null
        return null;
    }
};
