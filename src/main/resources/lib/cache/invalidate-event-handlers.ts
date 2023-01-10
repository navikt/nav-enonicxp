import eventLib, { EnonicEvent } from '/lib/xp/event';
import { contentRepoDefault } from '../constants';
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

let hasSetupListeners = false;

const nodeListenerCallback = (event: EnonicEvent) => {
    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === contentRepoDefault) {
            const isPrepublished = handleScheduledPublish(node, event.type);

            if (!isPrepublished) {
                invalidateCacheForNode({
                    node,
                    eventType: event.type,
                    timestamp: event.timestamp,
                    isRunningClusterWide: true,
                });
            }
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

export const activateCacheEventListeners = () => {
    if (!hasSetupListeners) {
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

        logger.info('Started: Cache eventListener on node events');
        hasSetupListeners = true;
    } else {
        logger.error('Cache node listeners already running');
    }
};
