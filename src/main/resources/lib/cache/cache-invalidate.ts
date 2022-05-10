import contentLib from '/lib/xp/content';
import clusterLib from '/lib/xp/cluster';
import taskLib from '/lib/xp/task';
import { frontendCacheInvalidate } from './frontend-invalidate-requests';
import { runInBranchContext } from '../utils/branch-context';
import { findReferences } from './find-references';
import { generateCacheEventId, NodeEventData } from './utils';
import { findChangedPaths } from './find-changed-paths';
import { clearLocalCaches, getCachesToClear, sendLocalCacheInvalidationEvent } from './local-cache';
import { logger } from '../utils/logging';

export const cacheInvalidateEventName = 'invalidate-cache';

const getContentToInvalidate = (id: string, eventType: string) => {
    // If the content was deleted, we must check in the draft branch for references
    const branch = eventType === 'node.deleted' ? 'draft' : 'master';

    const referencesToInvalidate = findReferences(id, branch);

    const baseContent = runInBranchContext(() => contentLib.get({ key: id }), branch);

    if (baseContent) {
        return [baseContent, ...referencesToInvalidate];
    }

    return referencesToInvalidate;
};

type InvalidateCacheParams = {
    node: NodeEventData;
    eventType: string;
    timestamp: number;
    isRunningClusterWide: boolean;
};

const _invalidateCacheForNode = ({
    node,
    eventType,
    timestamp,
    isRunningClusterWide,
}: InvalidateCacheParams) => {
    const eventId = generateCacheEventId(node, timestamp);

    // If this invalidation is running on every node in the cluster, we only want the master node
    // to send calls to the frontend
    const shouldSendFrontendRequests = !isRunningClusterWide || clusterLib.isMaster();

    // If this invalidation is running on every node, we can just clear local caches immediately.
    // Otherwise we must send a cluster-wide event so every node gets cleared
    const clearLocalCachesFunc = isRunningClusterWide
        ? clearLocalCaches
        : sendLocalCacheInvalidationEvent;

    runInBranchContext(() => {
        const contentToInvalidate = getContentToInvalidate(node.id, eventType);

        clearLocalCachesFunc(getCachesToClear(contentToInvalidate));

        logger.info(
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
                logger.info(
                    `Invalidating changed paths for node ${
                        node.id
                    } (event id ${eventId}): ${changedPaths.join(', ')}`
                );
            }

            frontendCacheInvalidate({
                contents: contentToInvalidate,
                paths: changedPaths,
                eventId,
            });
        }
    }, 'master');
};

export const invalidateCacheForNode = (params: InvalidateCacheParams) => {
    taskLib.executeFunction({
        description: `Cache invalidation for node ${params.node.id}`,
        func: () => _invalidateCacheForNode(params),
    });
};
