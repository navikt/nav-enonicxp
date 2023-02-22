import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as clusterLib from '/lib/xp/cluster';
import * as taskLib from '/lib/xp/task';
import { frontendInvalidateAllDeferred, frontendInvalidatePaths } from './frontend-cache';
import { runInContext } from '../context/run-in-context';
import { findReferences } from './find-references';
import { generateCacheEventId, isPublicRenderedType, NodeEventData } from './utils';
import { findChangedPaths } from './find-changed-paths';
import { invalidateLocalCaches, sendLocalCacheInvalidationEvent } from './local-cache';
import { logger } from '../utils/logging';
import { runInLocaleContext } from '../localization/locale-context';
import { getLayersData } from '../localization/layers-data';
import { hasValidCustomPath } from '../custom-paths/custom-paths';
import { buildLocalePath } from '../localization/locale-utils';
import { forceArray } from '../utils/nav-utils';

export const CACHE_INVALIDATE_EVENT_NAME = 'invalidate-cache';

const REFERENCE_SEARCH_TIMEOUT_MS = 5000;

const resolveContentForInvalidation = (id: string, eventType: string) => {
    // If the content was deleted, we must check in the draft branch for references
    const branch = eventType === 'node.deleted' ? 'draft' : 'master';

    const referencesToInvalidate = findReferences(id, branch, REFERENCE_SEARCH_TIMEOUT_MS);
    if (!referencesToInvalidate) {
        return null;
    }

    const baseContent = runInContext({ branch }, () => contentLib.get({ key: id }));

    if (baseContent) {
        return [baseContent, ...referencesToInvalidate];
    }

    return referencesToInvalidate;
};

const getPathsToInvalidate = (contentToInvalidate: Content[], locale: string) =>
    contentToInvalidate.reduce<string[]>((acc, content) => {
        if (!isPublicRenderedType(content)) {
            return acc;
        }

        const basePath = hasValidCustomPath(content) ? content.data.customPath : content._path;

        return [...acc, buildLocalePath(basePath, locale)];
    }, []);

// const getLocalizedPathsToInvalidate = (id: string, eventType: string) => {
//     const { localeToRepoIdMap, defaultLocale } = getLayersData();
//
//     const locales = Object.keys(localeToRepoIdMap);
//
//     return locales.reduce<string[]>((acc, locale) => {
//         if (locale === defaultLocale) {
//             return acc;
//         }
//
//         const references = runInLocaleContext({ locale }, () =>
//             getContentToInvalidate(id, eventType)
//         );
//
//         //.filter((content) => !forceArray((content as any).inherit).includes('CONTENT'));
//
//         const paths = getPathsToInvalidate(references, locale);
//
//         return [...acc, ...paths];
//     }, []);
// };

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
    // If this invalidation is running on every node, we can just clear local caches immediately
    // Otherwise, we must send a cluster-wide event so every node gets cleared
    if (isRunningClusterWide) {
        invalidateLocalCaches();
    } else {
        sendLocalCacheInvalidationEvent();
    }

    // If this invalidation is running on every node in the cluster, we only want the master node
    // to send invalidation calls to the frontend
    if (!isRunningClusterWide || clusterLib.isMaster()) {
        return;
    }

    const { repoIdToLocaleMap } = getLayersData();
    const locale = repoIdToLocaleMap[node.repo];

    runInLocaleContext({ branch: 'master', locale }, () => {
        const eventId = generateCacheEventId(node, timestamp);
        const contentToInvalidate = resolveContentForInvalidation(node.id, eventType);

        if (!contentToInvalidate) {
            logger.warning(`Resolving content to invalidate timed out for eventId ${eventId}`);
            frontendInvalidateAllDeferred(eventId, REFERENCE_SEARCH_TIMEOUT_MS * 2, true);
            return;
        }

        logger.info(
            `Invalidate event ${eventId} - Invalidating ${
                contentToInvalidate.length
            } paths for root node ${node.id}: ${JSON.stringify(
                contentToInvalidate.map((content) => content._path),
                null,
                4
            )}`
        );

        const changedPaths = findChangedPaths(node);

        if (changedPaths.length > 0) {
            logger.info(
                `Invalidating changed paths for node ${
                    node.id
                } (event id ${eventId}): ${changedPaths.join(', ')}`
            );
        }

        const currentPaths = getPathsToInvalidate(contentToInvalidate, locale);

        const localizedPathsToInvalidate = [] as string[]; // getLocalizedPathsToInvalidate(node.id, eventType);

        frontendInvalidatePaths({
            paths: [...changedPaths, ...currentPaths, ...localizedPathsToInvalidate],
            eventId,
        });
    });
};

export const invalidateCacheForNode = (params: InvalidateCacheParams) => {
    taskLib.executeFunction({
        description: `Cache invalidation for node ${params.node.id}`,
        func: () => _invalidateCacheForNode(params),
    });
};
