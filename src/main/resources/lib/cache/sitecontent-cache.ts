import cacheLib from '/lib/cache';

const oneWeek = 60 * 60 * 24 * 7;

const cache = cacheLib.newCache({ size: 10000, expire: oneWeek });

const getCacheKey = (contentId: string, cacheVersionKey: string) =>
    `${contentId}-${cacheVersionKey}`;

export const getContentFromCache = (
    contentId: string,
    cacheVersionKey: string,
    callback: () => any
) => {
    const cacheKey = getCacheKey(contentId, cacheVersionKey);
    log.info(`Getting content cached with key ${cacheKey}`);
    return cache.get(cacheKey, callback);
};
