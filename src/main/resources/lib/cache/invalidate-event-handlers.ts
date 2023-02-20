import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import { handleScheduledPublish } from '../scheduling/scheduled-publish';
import { addReliableEventListener } from '../events/reliable-custom-events';
import {
    invalidateLocalCaches,
    LocalCacheInvalidationData,
    localCacheInvalidationEventName,
} from './local-cache';
import { NodeEventData } from './utils';
import { cacheInvalidateEventName, invalidateCacheForNode } from './cache-invalidate';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { getLayersData } from '../localization/layers-data';
import {
    activateDeferCacheInvalidationEventListener,
    isDeferringCacheInvalidation,
} from './invalidate-event-defer';

// TODO: When Enonic implements custom widgets for the admin front page,
// show a warning when cache invalidation is deferred

let hasSetupListeners = false;

const nodeListenerCallback = (event: EnonicEvent) => {
    if (isDeferringCacheInvalidation()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        if (node.branch !== 'master') {
            return;
        }

        const locale = getLayersData().repoIdToLocaleMap[node.repo];
        if (!locale) {
            logger.info(`Repo ${node.repo} does not belong to a locale`);
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
    runInContext({ asAdmin: true }, () =>
        invalidateCacheForNode({
            node: event.data,
            timestamp: event.timestamp,
            eventType: event.type,
            isRunningClusterWide: true,
        })
    );
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
            invalidateLocalCaches(event.data);
        },
    });

    // This event is sent via the Content Studio widget for manual invalidation of a single page
    addReliableEventListener<NodeEventData>({
        type: cacheInvalidateEventName,
        callback: manualInvalidationCallback,
    });

    activateDeferCacheInvalidationEventListener();

    logger.info('Started event listeners for cache invalidation ');
};
