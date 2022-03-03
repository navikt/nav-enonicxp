import eventLib, { EnonicEvent } from '/lib/xp/event';
import contentLib from '/lib/xp/content';
import { frontendCacheInvalidate, frontendCacheWipeAll } from './frontend-invalidate-requests';
import { runInBranchContext } from '../utils/branch-context';
import { handleScheduledPublish } from './scheduled-publish';
import { contentRepo } from '../constants';
import { PrepublishCacheWipeConfig } from '../../tasks/prepublish-cache-wipe/prepublish-cache-wipe-config';
import { addReliableEventListener } from '../events/reliable-custom-events';
import { findReferences } from './find-references';
import { wipeSiteinfoCache } from '../controllers/site-info';
import { generateCacheEventId, NodeEventData } from './utils';
import { findChangedPaths } from './find-changed-paths';
import { clearDriftsmeldingerCache } from '../../services/driftsmeldinger/driftsmeldinger';
import { clearDecoratorMenuCache } from '../../services/menu/menu';

const invalidateWithReferences = ({
    id,
    path,
    eventId,
    eventType,
}: {
    id: string;
    path: string;
    eventId: string;
    eventType?: string;
}) => {
    const baseContent = runInBranchContext(
        () => contentLib.get({ key: id }),
        eventType === 'node.deleted' ? 'draft' : 'master'
    );

    const contentToInvalidate = findReferences({ id, eventType });
    const changedPaths = findChangedPaths({ id, path });

    log.info(
        `Invalidate event ${eventId} - Invalidating cache for ${path}${
            changedPaths.length > 0 ? ` and previous paths ${changedPaths.join(', ')}` : ''
        } with ${contentToInvalidate.length} references: ${JSON.stringify(
            contentToInvalidate.map((content) => content._path),
            null,
            4
        )}`
    );

    if (baseContent) {
        contentToInvalidate.push(baseContent);
    }

    if (eventType === 'node.deleted') {
        changedPaths.push(path);
    }

    if (contentToInvalidate.some((content) => content.type === 'no.nav.navno:melding')) {
        log.info(`Clearing driftsmeldinger cache on invalidate event ${eventId}`);
        clearDriftsmeldingerCache();
    }

    if (contentToInvalidate.some((content) => content.type === 'no.nav.navno:megamenu-item')) {
        log.info(`Clearing decorator menu cache on invalidate event ${eventId}`);
        clearDecoratorMenuCache();
    }

    frontendCacheInvalidate({
        contents: contentToInvalidate,
        paths: changedPaths,
        eventId,
    });
};

const invalidateCacheForNode = ({
    node,
    eventType,
    timestamp,
}: {
    node: NodeEventData;
    eventType: string;
    timestamp: number;
}) => {
    const eventId = generateCacheEventId(node, timestamp);

    if (node.path.includes('/global-notifications/')) {
        log.info('Clearing whole cache due to updated global notification');
        frontendCacheWipeAll(eventId);
    } else {
        runInBranchContext(() => {
            invalidateWithReferences({ id: node.id, path: node.path, eventId, eventType });
        }, 'master');
    }
};

const nodeListenerCallback = (event: EnonicEvent) => {
    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === contentRepo) {
            const isPrepublished = handleScheduledPublish(node, event.type);

            if (!isPrepublished) {
                invalidateCacheForNode({ node, eventType: event.type, timestamp: event.timestamp });
            }
        }
    });
    wipeSiteinfoCache();
};

const prepublishCallback = (event: EnonicEvent<PrepublishCacheWipeConfig>) => {
    log.info(`Clearing cache for prepublished content: ${event.data.path}`);
    invalidateCacheForNode({
        node: { ...event.data, branch: 'master', repo: contentRepo },
        eventType: event.type,
        timestamp: event.timestamp,
    });
    wipeSiteinfoCache();
};

export const cacheInvalidateEventName = 'invalidate-cache';
export const prepublishInvalidateEvent = 'prepublish-invalidate';

let hasSetupListeners = false;

export const activateCacheEventListeners = () => {
    if (!hasSetupListeners) {
        eventLib.listener({
            type: '(node.pushed|node.deleted)',
            localOnly: false,
            callback: nodeListenerCallback,
        });

        addReliableEventListener({
            type: prepublishInvalidateEvent,
            callback: prepublishCallback,
        });

        addReliableEventListener<NodeEventData>({
            type: cacheInvalidateEventName,
            callback: (event) => {
                const { id, path, eventId } = event.data;
                log.info(`Received cache-invalidation event for ${path} - ${id}`);
                runInBranchContext(() => invalidateWithReferences({ id, path, eventId }), 'master');
            },
        });

        log.info('Started: Cache eventListener on node events');
        hasSetupListeners = true;
    } else {
        log.warning('Cache node listeners already running');
    }
};
