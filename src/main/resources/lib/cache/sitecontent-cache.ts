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
    return cache.get(getCacheKey(contentId, cacheVersionKey), callback);
};
