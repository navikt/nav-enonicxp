import { logger } from '../../lib/utils/logging';
import { CacheInvalidationDeferConfig } from './cache-invalidation-defer-config';
import { toggleCacheInvalidationOnNodeEvents } from '../../lib/cache/invalidate-event-defer';

export const run = ({ shouldDefer, maxDeferTime }: CacheInvalidationDeferConfig) => {
    logger.info(`Running task for cache invalidation defer toggle - deferring? ${shouldDefer}`);

    toggleCacheInvalidationOnNodeEvents({ shouldDefer, maxDeferTime });
};
