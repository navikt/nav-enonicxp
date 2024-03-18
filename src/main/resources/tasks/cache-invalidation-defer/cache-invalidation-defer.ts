import { logger } from '../../lib/utils/logging';
import { toggleCacheInvalidationOnNodeEvents } from '../../lib/cache/invalidate-event-defer';
import { CacheInvalidationDefer } from '@xp-types/tasks/cache-invalidation-defer';

export const run = ({ shouldDefer, maxDeferTime }: CacheInvalidationDefer) => {
    logger.info(`Running task for cache invalidation defer toggle - deferring? ${shouldDefer}`);

    toggleCacheInvalidationOnNodeEvents({ shouldDefer, maxDeferTime });
};
