import { Content } from '/lib/xp/content';
import * as clusterLib from '/lib/xp/cluster';
import * as taskLib from '/lib/xp/task';
import {
    frontendInvalidateAllDeferred,
    frontendInvalidatePaths,
    isFrontendInvalidateAllScheduled,
} from './frontend-cache';
import { generateCacheEventId, isPublicRenderedType, NodeEventData } from './utils';
import { findChangedPaths } from './find-changed-paths';
import { invalidateLocalCache, sendLocalCacheInvalidationEvent } from './local-cache';
import { logger } from '../utils/logging';
import { runInLocaleContext } from '../localization/locale-context';
import { getLayersData } from '../localization/layers-data';
import { removeDuplicates } from '../utils/array-utils';
import { getPublicPath } from '../paths/public-path';
import { ContentReferencesFinder } from './find-refs-new';

export const CACHE_INVALIDATE_EVENT_NAME = 'invalidate-cache';

const REFERENCE_SEARCH_TIMEOUT_MS = 10000;

const getPaths = (contents: Content[], locale: string) =>
    contents.reduce<string[]>((acc, content) => {
        if (isPublicRenderedType(content)) {
            acc.push(getPublicPath(content, locale));
        }

        return acc;
    }, []);

export const resolveReferencePaths = (id: string, eventType: string) => {
    // If the content was deleted, we must check in the draft branch for references
    const branch = eventType === 'node.deleted' ? 'draft' : 'master';

    const { locales, localeToRepoIdMap } = getLayersData();

    const pathsToInvalidate: string[] = [];

    const success = locales.every((locale) => {
        const repoId = localeToRepoIdMap[locale];

        const contentReferenceFinder = new ContentReferencesFinder({
            baseContentId: id,
            branch,
            repoId,
            withDeepSearch: true,
            timeout: REFERENCE_SEARCH_TIMEOUT_MS,
        });

        const references = contentReferenceFinder.run();
        if (!references) {
            return false;
        }

        const localizedPaths = getPaths(references, locale);

        pathsToInvalidate.push(...localizedPaths);
        return true;
    });

    return success ? removeDuplicates(pathsToInvalidate) : null;
};

const resolveReferencesAndInvalidateFrontend = ({
    node,
    eventType,
    timestamp,
}: InvalidateCacheParams) => {
    const { repoIdToLocaleMap } = getLayersData();
    const locale = repoIdToLocaleMap[node.repo];

    const eventId = generateCacheEventId(node, timestamp);

    runInLocaleContext({ branch: 'master', locale }, () => {
        const pathsToInvalidate = resolveReferencePaths(node.id, eventType);

        if (!pathsToInvalidate) {
            logger.warning(`Resolving paths for references failed for eventId ${eventId}`);
            // If resolving reference paths fails, schedule a full invalidation of the frontend cache
            // We defer this call a bit in case there are other events in the queue
            frontendInvalidateAllDeferred(eventId, REFERENCE_SEARCH_TIMEOUT_MS * 2, true);
            return;
        }

        logger.info(
            `Invalidate event ${eventId} - Invalidating ${
                pathsToInvalidate.length
            } paths for root node ${node.id}: ${JSON.stringify(pathsToInvalidate, null, 4)}`
        );

        const changedPaths = findChangedPaths(node);
        if (changedPaths.length > 0) {
            logger.info(
                `Invalidating changed paths for node ${
                    node.id
                } (event id ${eventId}): ${changedPaths.join(', ')}`
            );
        }

        frontendInvalidatePaths({
            paths: [...changedPaths, ...pathsToInvalidate],
            eventId,
        });
    });
};

export type InvalidateCacheParams = {
    node: NodeEventData;
    eventType: string;
    timestamp: number;
    isRunningClusterWide: boolean;
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

    resolveReferencesAndInvalidateFrontend(params);
};

export const invalidateCacheForNode = (params: InvalidateCacheParams) => {
    taskLib.executeFunction({
        description: `Cache invalidation for node ${params.node.id}`,
        func: () => _invalidateCacheForNode(params),
    });
};
