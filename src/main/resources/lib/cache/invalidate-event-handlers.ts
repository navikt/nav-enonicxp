import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import { handleScheduledPublish } from '../scheduling/scheduled-publish';
import { invalidateLocalCache, LOCAL_CACHE_INVALIDATION_EVENT_NAME } from './local-cache';
import { NodeEventData } from './utils';
import { CACHE_INVALIDATE_EVENT_NAME, invalidateCacheForNode } from './cache-invalidate';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { getLayersData } from '../localization/layers-data';
import {
    activateDeferCacheInvalidationEventListener,
    isDeferringCacheInvalidation,
} from './invalidate-event-defer';
import { customListenerType } from '../utils/events';
import { getRepoConnection } from '../utils/repo-utils';
import { isContentLocalized } from '../localization/locale-utils';
import { NAVNO_ROOT_PATH } from '../constants';

let hasSetupListeners = false;

const NODE_ROOT_PATH = `/content${NAVNO_ROOT_PATH}/`;

const nodeListenerCallback = (event: EnonicEvent) => {
    if (isDeferringCacheInvalidation()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        if (node.branch !== 'master') {
            return;
        }

        if (!node.path.startsWith(NODE_ROOT_PATH)) {
            return;
        }

        // This callback is only applicable to repos belonging to a content layer
        const locale = getLayersData().repoIdToLocaleMap[node.repo];
        if (!locale) {
            return;
        }

        const content = getRepoConnection({
            branch: 'draft',
            asAdmin: true,
            repoId: node.repo,
        }).get(node.id);

        if (!content || !isContentLocalized(content)) {
            logger.info(
                `Content is not localized, skipping cache invalidation ${JSON.stringify(node)}`
            );
            return;
        }

        const isPrepublished = handleScheduledPublish(node, event.type);
        if (isPrepublished) {
            return;
        }

        invalidateCacheForNode({
            node,
            eventType: event.type,
            timestamp: event.timestamp,
            isRunningClusterWide: true,
        });
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
    eventLib.listener({
        type: customListenerType(LOCAL_CACHE_INVALIDATION_EVENT_NAME),
        localOnly: false,
        callback: invalidateLocalCache,
    });

    // This event is sent via the Content Studio widget for manual invalidation of a single page
    eventLib.listener<NodeEventData>({
        type: customListenerType(CACHE_INVALIDATE_EVENT_NAME),
        localOnly: false,
        callback: manualInvalidationCallback,
    });

    activateDeferCacheInvalidationEventListener();

    logger.info('Started event listeners for cache invalidation ');
};
