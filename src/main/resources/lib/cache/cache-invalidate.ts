import eventLib, { EnonicEvent } from '/lib/xp/event';
import contentLib from '/lib/xp/content';
import clusterLib from '/lib/xp/cluster';
import { frontendCacheInvalidate, frontendCacheWipeAll } from './frontend-invalidate-requests';
import { runInBranchContext } from '../utils/branch-context';
import { handleScheduledPublish } from './scheduled-publish';
import { contentRepo } from '../constants';
import { addReliableEventListener } from '../events/reliable-custom-events';
import { findReferences } from './find-references';
import { generateCacheEventId, NodeEventData } from './utils';
import { findChangedPaths } from './find-changed-paths';
import {
    clearLocalCaches,
    getCachesToClear,
    LocalCacheInvalidationData,
    localCacheInvalidationEventName,
    sendLocalCacheInvalidationEvent,
} from './local-cache';

export const cacheInvalidateEventName = 'invalidate-cache';

let hasSetupListeners = false;

const getContentToInvalidate = (id: string, eventType: string) => {
    const referencesToInvalidate = findReferences({ id, eventType });

    const baseContent = runInBranchContext(
        () => contentLib.get({ key: id }),
        eventType === 'node.deleted' ? 'draft' : 'master'
    );

    if (baseContent) {
        return [baseContent, ...referencesToInvalidate];
    }

    return referencesToInvalidate;
};

export const invalidateCacheForNode = ({
    node,
    eventType,
    timestamp,
    isRunningClusterWide,
}: {
    node: NodeEventData;
    eventType: string;
    timestamp: number;
    isRunningClusterWide: boolean;
}) => {
    const eventId = generateCacheEventId(node, timestamp);

    // If this invalidation is running on every node in the cluster, we only want the master node
    // to send calls to the frontend
    const shouldSendFrontendRequests = !isRunningClusterWide || clusterLib.isMaster();

    if (node.path.includes('/global-notifications/')) {
        log.info('Clearing whole cache due to updated global notification');

        const localCachesToClear = { all: true };

        if (isRunningClusterWide) {
            clearLocalCaches(localCachesToClear);
        } else {
            sendLocalCacheInvalidationEvent(localCachesToClear);
        }

        if (shouldSendFrontendRequests) {
            frontendCacheWipeAll(eventId);
        }
    } else {
        runInBranchContext(() => {
            const contentToInvalidate = getContentToInvalidate(node.id, eventType);

            const localCachesToClear = getCachesToClear(contentToInvalidate);

            if (isRunningClusterWide) {
                clearLocalCaches(localCachesToClear);
            } else {
                sendLocalCacheInvalidationEvent(localCachesToClear);
            }

            log.info(
                `Invalidate event ${eventId} - Invalidating ${
                    contentToInvalidate.length
                } paths for root node ${node.id}: ${JSON.stringify(
                    contentToInvalidate.map((content) => content._path),
                    null,
                    4
                )}`
            );

            if (shouldSendFrontendRequests) {
                const changedPaths = findChangedPaths({ id: node.id, path: node.path });

                if (changedPaths.length > 0) {
                    log.info(
                        `Invalidating changed paths for node ${node.id}: ${changedPaths.join(', ')}`
                    );
                }

                frontendCacheInvalidate({
                    contents: contentToInvalidate,
                    paths: changedPaths,
                    eventId,
                });
            }
        }, 'master');
    }
};

const nodeListenerCallback = (event: EnonicEvent) => {
    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === contentRepo) {
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

export const activateCacheEventListeners = () => {
    if (!hasSetupListeners) {
        eventLib.listener({
            type: '(node.pushed|node.deleted)',
            localOnly: false,
            callback: nodeListenerCallback,
        });

        // This event triggers invalidation of local caches
        addReliableEventListener<LocalCacheInvalidationData>({
            type: localCacheInvalidationEventName,
            callback: (event) => {
                clearLocalCaches(event.data);
            },
        });

        // This event is sent via the Content Studio widget for manual invalidation of a single page
        addReliableEventListener<NodeEventData>({
            type: cacheInvalidateEventName,
            callback: (event) => {
                const { id, path } = event.data;
                log.info(`Received cache-invalidation event for ${path} - ${id}`);
                runInBranchContext(() =>
                    invalidateCacheForNode({
                        node: { id, path, branch: 'master', repo: contentRepo },
                        timestamp: event.timestamp,
                        eventType: event.type,
                        isRunningClusterWide: true,
                    })
                );
            },
        });

        log.info('Started: Cache eventListener on node events');
        hasSetupListeners = true;
    } else {
        log.warning('Cache node listeners already running');
    }
};
