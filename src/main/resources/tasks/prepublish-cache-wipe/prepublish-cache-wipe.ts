import { PrepublishCacheWipeConfig } from './prepublish-cache-wipe-config';
import { sendReliableEvent } from '../../lib/events/reliable-custom-events';
import { prepublishInvalidateEvent } from '../../lib/siteCache';

export const run = (params: PrepublishCacheWipeConfig) => {
    log.info(`Running task for prepublish cache wipe - ${params.id}`);

    sendReliableEvent({
        type: prepublishInvalidateEvent,
        data: params,
    });
};
