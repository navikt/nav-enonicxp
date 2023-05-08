import cacheLib from '/lib/cache';
import { SiteContentParams } from './sitecontent';

const oneDay = 60 * 60 * 24;

const cache = cacheLib.newCache({ size: 10000, expire: oneDay });

const getCacheKeyForRequest = ({ id, cacheKey, locale, branch, preview }: SiteContentParams) =>
    `${id}_${cacheKey}_${locale}_${branch}_${preview}`;

export const getResponseFromCache = (reqParams: SiteContentParams, callback: () => any) => {
    // If no cache key is provided, do not get from cache
    if (!reqParams.cacheKey) {
        return callback();
    }

    const requestSpecificCacheKey = getCacheKeyForRequest(reqParams);

    try {
        return cache.get(requestSpecificCacheKey, callback);
    } catch (e: any) {
        // cache.get throws if callback returns null
        if (e.message.startsWith('CacheLoader returned null for key')) {
            return null;
        }

        // For any other error, throw to the next handler
        throw e;
    }
};
