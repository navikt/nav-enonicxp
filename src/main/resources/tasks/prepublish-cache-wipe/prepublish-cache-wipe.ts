import { PrepublishCacheWipeConfig } from './prepublish-cache-wipe-config';
import { sendReliableEvent } from '../../lib/events/reliable-custom-events';
import { prepublishInvalidateEvent } from '../../lib/siteCache/cache-invalidate';

export const run = (params: PrepublishCacheWipeConfig) => {
    log.info(
        `Running task for cache invalidation of prepublished content - ${params.id} - ${params.path}`
    );

    sendReliableEvent({
        type: prepublishInvalidateEvent,
        data: params,
    });
};
