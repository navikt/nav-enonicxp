import * as clusterLib from '/lib/xp/cluster';
import * as taskLib from '/lib/xp/task';
import {
    frontendInvalidateAllDeferred,
    frontendInvalidatePaths,
    isFrontendInvalidateAllScheduled,
} from './frontend-cache';
import { generateCacheEventId, NodeEventData } from './utils';
import { findPathsToInvalidate } from './find-paths-to-invalidate';
import { invalidateLocalCache, sendLocalCacheInvalidationEvent } from './local-cache';
import { logger } from '../utils/logging';

export type InvalidateCacheParams = {
    node: NodeEventData;
    eventType: string;
    timestamp: number;
    isRunningClusterWide: boolean;
};

export const CACHE_INVALIDATE_EVENT_NAME = 'invalidate-cache';

const DEFER_TIME_ON_ERROR = 20000;

const resolvePathsAndInvalidateFrontendCache = ({
    node,
    eventType,
    timestamp,
}: InvalidateCacheParams) => {
    const eventId = generateCacheEventId(node, timestamp);

    const pathsToInvalidate = findPathsToInvalidate(node, eventType);

    if (!pathsToInvalidate) {
        logger.error(`Resolving paths for invalidation failed - eventId: "${eventId}"`);
        // If resolving reference paths fails, schedule a full invalidation of the frontend cache
        // We defer this call a bit in case there are other events queued
        frontendInvalidateAllDeferred(eventId, DEFER_TIME_ON_ERROR, true);
        return;
    }

    logger.info(
        `Invalidate event ${eventId} - Invalidating ${
            pathsToInvalidate.length
        } paths for root node ${node.id} in repo ${node.repo}: ${JSON.stringify(
            pathsToInvalidate,
            null,
            4
        )}`
    );

    frontendInvalidatePaths({
        paths: pathsToInvalidate,
        eventId,
    });
};

const _invalidateCacheForNode = (params: InvalidateCacheParams) => {
    const { isRunningClusterWide, node } = params;

    // If this invalidation is running on every node, we can just clear local caches immediately
    // Otherwise, we must send a cluster-wide event so every node gets cleared
    if (isRunningClusterWide) {
        invalidateLocalCache();
    } else {
        sendLocalCacheInvalidationEvent();
    }

    // If this invalidation is running on every node, we only want the master node to send
    // invalidation calls to the frontend
    if (isRunningClusterWide && !clusterLib.isMaster()) {
        return;
    }

    if (isFrontendInvalidateAllScheduled()) {
        logger.info(
            `Full cache invalidation is already scheduled, skipping invalidation for ${node.id}/${node.repo}/${node.branch}`
        );
        return;
    }

    resolvePathsAndInvalidateFrontendCache(params);
};

export const invalidateCacheForNode = (params: InvalidateCacheParams) => {
    taskLib.executeFunction({
        description: `Cache invalidation for node ${params.node.id}/${params.node.repo}`,
        func: () => _invalidateCacheForNode(params),
    });
};
