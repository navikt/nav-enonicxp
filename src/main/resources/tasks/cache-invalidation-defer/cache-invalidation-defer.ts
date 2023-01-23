import { logger } from '../../lib/utils/logging';
import { toggleCacheInvalidationOnNodeEvents } from '../../lib/cache/invalidate-event-handlers';
import { CacheInvalidationDeferConfig } from './cache-invalidation-defer-config';

export const run = ({ shouldDefer, maxDeferTime }: CacheInvalidationDeferConfig) => {
    logger.info(`Running task for cache invalidation defer toggle - deferring? ${shouldDefer}`);

    toggleCacheInvalidationOnNodeEvents({ shouldDefer, maxDeferTime });
};
