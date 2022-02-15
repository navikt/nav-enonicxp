import eventLib from '/lib/xp/event';
import { PrepublishCacheWipeConfig } from './prepublish-cache-wipe-config';

export const prepublishInvalidateEvent = 'prepublish-invalidate';

export const run = (params: PrepublishCacheWipeConfig) => {
    log.info(`Running task for prepublish cache wipe - ${params.id}`);

    eventLib.send({
        type: prepublishInvalidateEvent,
        distributed: true,
        data: params,
    });
};
