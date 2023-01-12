import eventLib, { EnonicEvent } from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import { appDescriptor, contentRootRepoId } from '../constants';
import { handleScheduledPublish } from '../scheduling/scheduled-publish';
import { addReliableEventListener } from '../events/reliable-custom-events';
import {
    clearLocalCaches,
    LocalCacheInvalidationData,
    localCacheInvalidationEventName,
} from './local-cache';
import { NodeEventData } from './utils';
import { runInBranchContext } from '../context/branches';
import { cacheInvalidateEventName, invalidateCacheForNode } from './cache-invalidate';
import { logger } from '../utils/logging';
import { frontendInvalidateAllAsync } from './frontend-cache';
import { generateUUID } from '../utils/uuid';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { CacheInvalidationDeferConfig } from '../../tasks/cache-invalidation-defer/cache-invalidation-defer-config';

type DeferCacheInvalidationEventData = CacheInvalidationDeferConfig;

const deferInvalidationEventName = 'deferCacheInvalidation';
const deferredTimeMsDefault = 1000 * 60 * 30;

let hasSetupListeners = false;
let isDeferring = false;

const nodeListenerCallback = (event: EnonicEvent) => {
    if (isDeferring) {
        return;
    }

    event.data.nodes.forEach((node) => {
        if (node.branch !== 'master' || node.repo !== contentRootRepoId) {
            return;
        }

        const isPrepublished = handleScheduledPublish(node, event.type);
        if (!isPrepublished) {
            invalidateCacheForNode({
                node,
                eventType: event.type,
                timestamp: event.timestamp,
                isRunningClusterWide: true,
            });
        }
    });
};

const manualInvalidationCallback = (event: EnonicEvent<NodeEventData>) => {
    const { id, path } = event.data;
    logger.info(`Received cache-invalidation event for ${path} - ${id}`);
    runInBranchContext(() =>
        invalidateCacheForNode({
            node: event.data,
            timestamp: event.timestamp,
            eventType: event.type,
            isRunningClusterWide: true,
        })
    );
};

const deferInvalidationCallback = (event: EnonicEvent<DeferCacheInvalidationEventData>) => {
    const { shouldDefer, maxDeferTime = deferredTimeMsDefault } = event.data;

    if (isDeferring && !shouldDefer) {
        // When deferred invalidation state is toggled off, invalidate everything
        // to ensure caches will be consistent again
        clearLocalCaches({ all: true });
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
            taskDescriptor: `${appDescriptor}:cache-invalidation-defer`,
            taskConfig: {
                shouldDefer: false,
            },
        });
    }

    isDeferring = shouldDefer;
};

export const toggleCacheInvalidationOnNodeEvents = (eventData: DeferCacheInvalidationEventData) => {
    eventLib.send({
        type: deferInvalidationEventName,
        distributed: true,
        data: eventData,
    });
};

export const activateCacheEventListeners = () => {
    if (hasSetupListeners) {
        logger.error('Cache node listeners already running');
        return;
    }

    hasSetupListeners = true;

    // Invalidate cache on publish/unpublish actions
    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        localOnly: false,
        callback: nodeListenerCallback,
    });

    // This event triggers invalidation of local caches and is sent when invalidateCacheForNode
    // is not executed cluster-wide
    addReliableEventListener<LocalCacheInvalidationData>({
        type: localCacheInvalidationEventName,
        callback: (event) => {
            clearLocalCaches(event.data);
        },
    });

    // This event is sent via the Content Studio widget for manual invalidation of a single page
    addReliableEventListener<NodeEventData>({
        type: cacheInvalidateEventName,
        callback: manualInvalidationCallback,
    });

    // Pause cache invalidation on node events. Useful if we do certain large batch job which generates
    // a lot of events, for which we may not want to trigger cache invalidation.
    eventLib.listener<DeferCacheInvalidationEventData>({
        type: `custom.${deferInvalidationEventName}`,
        localOnly: false,
        callback: deferInvalidationCallback,
    });

    logger.info('Started event listeners for cache invalidation ');
};
