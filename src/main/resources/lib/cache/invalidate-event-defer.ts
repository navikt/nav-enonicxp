import { EnonicEvent } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { invalidateLocalCache } from './local-cache';
import { frontendInvalidateAllAsync } from './frontend-cache';
import { generateUUID } from '../utils/uuid';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { CacheInvalidationDeferConfig } from '../../tasks/cache-invalidation-defer/cache-invalidation-defer-config';
import { APP_DESCRIPTOR } from '../constants';
import { addReliableEventListener, sendReliableEvent } from '../events/reliable-custom-events';

type DeferCacheInvalidationEventData = CacheInvalidationDeferConfig;

const deferredTimeMsDefault = 1000 * 60 * 30;
const deferInvalidationEventName = 'deferCacheInvalidation';

let hasSetupListeners = false;
let isDeferring = false;

const deferInvalidationCallback = (event: EnonicEvent<DeferCacheInvalidationEventData>) => {
    const { shouldDefer, maxDeferTime = deferredTimeMsDefault } = event.data;

    if (isDeferring && !shouldDefer) {
        // When deferred invalidation state is toggled off, invalidate everything
        // to ensure caches will be consistent again
        invalidateLocalCache();
        if (clusterLib.isMaster()) {
            frontendInvalidateAllAsync(`deferred-${generateUUID()}`, true);
        }
    } else if (!isDeferring && shouldDefer) {
        // When deferred invalidation state is toggled on, schedule it to be turned off after a
        // certain amount of time. This should preferably be handled by whichever action enabled the
        // deferred state, but we have this as a fallback to ensure it does not become stuck in the
        // deferred state.
        createOrUpdateSchedule<CacheInvalidationDeferConfig>({
            jobName: 'deferred-cache-invalidation',
            jobSchedule: {
                type: 'ONE_TIME',
                value: new Date(Date.now() + maxDeferTime).toISOString(),
            },
            taskDescriptor: `${APP_DESCRIPTOR}:cache-invalidation-defer`,
            taskConfig: {
                shouldDefer: false,
            },
        });
    }

    isDeferring = shouldDefer;
};

export const toggleCacheInvalidationOnNodeEvents = (eventData: DeferCacheInvalidationEventData) => {
    sendReliableEvent({
        type: deferInvalidationEventName,
        data: eventData,
    });
};

export const isDeferringCacheInvalidation = () => isDeferring;

export const activateDeferCacheInvalidationEventListener = () => {
    if (hasSetupListeners) {
        return;
    }

    hasSetupListeners = true;

    // Pause cache invalidation on node events for a period of time, then do a full wipe. Useful if
    // we do certain large batch jobs which generates a lot of events, for which we may not want to
    // trigger cache invalidation.
    addReliableEventListener<DeferCacheInvalidationEventData>({
        type: deferInvalidationEventName,
        callback: deferInvalidationCallback,
    });
};
