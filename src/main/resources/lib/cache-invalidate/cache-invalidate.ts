import eventLib, { EnonicEvent } from '/lib/xp/event';
import { frontendCacheInvalidatePaths, frontendCacheWipeAll } from './frontend-requests';
import { runInBranchContext } from '../utils/branch-context';
import { handleScheduledPublish } from './scheduled-publish';
import { contentRepo } from '../constants';
import { PrepublishCacheWipeConfig } from '../../tasks/prepublish-cache-wipe/prepublish-cache-wipe-config';
import { addReliableEventListener } from '../events/reliable-custom-events';
import { findReferencedPaths } from './find-references';
import { wipeSiteinfoCache } from '../controllers/site-info';
import { generateCacheEventId, NodeEventData } from './utils';
import { getChangedPaths } from './find-changed-paths';

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
    const referencedPaths = findReferencedPaths({ id, eventType });
    const changedPaths = getChangedPaths({ id, path });

    log.info(
        `Invalidating cache for ${path}${
            changedPaths.length > 0 ? ` and previous paths ${changedPaths.join(', ')}` : ''
        } with ${referencedPaths.length} references: ${JSON.stringify(referencedPaths, null, 4)}`
    );

    frontendCacheInvalidatePaths([path, ...referencedPaths, ...changedPaths], eventId);
};

const shouldWipeAll = (nodePath: string) => {
    if (nodePath.includes('/_templates/')) {
        log.info('Clearing whole cache due to updated template');
        return true;
    }

    if (nodePath.includes('/global-notifications/')) {
        log.info('Clearing whole cache due to updated global notification');
        return true;
    }

    return false;
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

    if (shouldWipeAll(node.path)) {
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
