import { logger } from '../../lib/utils/logging';
import { CacheInvalidateAllConfig } from './cache-invalidate-all-config';
import { frontendInvalidateAllSync } from '../../lib/cache/frontend-invalidate-requests';

export const run = ({ retryIfFail, eventId }: CacheInvalidateAllConfig) => {
    logger.info(`Running task for full cache invalidation - eventId ${eventId}`);

    frontendInvalidateAllSync(eventId, retryIfFail);
};
