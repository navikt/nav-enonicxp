import * as clusterLib from '/lib/xp/cluster';
import * as eventLib from '/lib/xp/event';
import { invalidateLocalCache } from './local-cache';
import { frontendInvalidateAllAsync } from './frontend-cache';
import { generateUUID } from '../utils/uuid';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { CacheInvalidationDeferConfig } from '../../tasks/cache-invalidation-defer/cache-invalidation-defer-config';
import { APP_DESCRIPTOR } from '../constants';
import { logger } from '../utils/logging';
import { customListenerType } from '../utils/events';

type DeferCacheInvalidationEventData = CacheInvalidationDeferConfig;

const DEFERRED_TIME_DEFAULT_MS = 1000 * 60 * 30;
const DEFER_CACHE_INVALIDATION_EVENT = 'deferCacheInvalidation';

let hasSetupListeners = false;
let isDeferring = false;

const deferInvalidationCallback = (eventData: DeferCacheInvalidationEventData) => {
    const { shouldDefer, maxDeferTime = DEFERRED_TIME_DEFAULT_MS } = eventData;

    if (isDeferring && !shouldDefer) {
        logger.info('Deferred cache invalidation toggled OFF');

        // When deferred invalidation state is toggled off, invalidate everything
        // to ensure caches will be consistent again
        invalidateLocalCache();
        if (clusterLib.isMaster()) {
            frontendInvalidateAllAsync(`deferred-${generateUUID()}`, true);
        }
    } else if (shouldDefer) {
        logger.info('Deferred cache invalidation toggled ON');

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
    deferInvalidationCallback(eventData);

    eventLib.send({
        type: DEFER_CACHE_INVALIDATION_EVENT,
        distributed: true,
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
    eventLib.listener<DeferCacheInvalidationEventData>({
        type: customListenerType(DEFER_CACHE_INVALIDATION_EVENT),
        localOnly: false,
        callback: (event) => deferInvalidationCallback(event.data),
    });
};
