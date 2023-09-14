import cacheLib from '/lib/cache';
import * as eventLib from '/lib/xp/event';

export const LOCAL_CACHE_INVALIDATION_EVENT_NAME = 'local-cache-invalidation';

const cache = cacheLib.newCache({ size: 100, expire: 900 });

export const getFromLocalCache = <Type = unknown>(cacheKey: string, callback: () => Type) =>
    cache.get(cacheKey, callback);

export const invalidateLocalCache = () => {
    cache.clear();
};

export const sendLocalCacheInvalidationEvent = () => {
    eventLib.send({
        type: LOCAL_CACHE_INVALIDATION_EVENT_NAME,
        distributed: true,
    });
};
