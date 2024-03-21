import { logger } from '../../lib/utils/logging';
import { frontendInvalidateAllSync } from '../../lib/cache/frontend-cache';
import { CacheInvalidateAll } from '@xp-types/tasks/cache-invalidate-all';

export const run = ({ retryIfFail, eventId }: CacheInvalidateAll) => {
    logger.info(`Running task for full cache invalidation - eventId ${eventId}`);

    frontendInvalidateAllSync(eventId, retryIfFail);
};
