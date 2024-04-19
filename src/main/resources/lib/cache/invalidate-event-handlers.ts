import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import { Content } from '/lib/xp/content';
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
import { scheduleContactInformationInvalidation } from './invalidate-special-content-types';
import { NAVNO_NODE_ROOT_PATH } from '../constants';
import { isMainDatanode } from '../cluster-utils/main-datanode';
import { updateExternalSearchDocumentForContent } from '../search/update-one';
import { draftCacheInvalidateOnUpdateEvent } from './draft-cache';

let hasSetupListeners = false;

const nodeListenerCallback = (event: EnonicEvent) => {
    if (isDeferringCacheInvalidation()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        if (node.branch !== 'master') {
            return;
        }

        if (!node.path.startsWith(NAVNO_NODE_ROOT_PATH)) {
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
        }).get<Content>(node.id);

        if (!content || !isContentLocalized(content)) {
            return;
        }

        const isPrepublished = handleScheduledPublish(node, event.type);
        if (isPrepublished) {
            return;
        }

        if (content.type === 'no.nav.navno:contact-information') {
            scheduleContactInformationInvalidation(content, node);
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
    const { id, path, repo } = event.data;
    logger.info(`Received cache-invalidation event for ${path} - ${id} [${repo}]`);
    runInContext({ asAdmin: true }, () => {
        invalidateCacheForNode({
            node: event.data,
            timestamp: event.timestamp,
            eventType: event.type,
            isRunningClusterWide: true,
        });

        if (isMainDatanode()) {
            updateExternalSearchDocumentForContent(id, repo);
        }
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
    eventLib.listener({
        type: customListenerType(LOCAL_CACHE_INVALIDATION_EVENT_NAME),
        localOnly: false,
        callback: invalidateLocalCache,
    });

    // Invalidate the draft cache on every content update
    eventLib.listener({
        type: 'node.updated',
        localOnly: false,
        callback: draftCacheInvalidateOnUpdateEvent,
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
