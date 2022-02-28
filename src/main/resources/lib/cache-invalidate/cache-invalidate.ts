import eventLib, { EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
import {
    frontendCacheRevalidate,
    frontendCacheWipeAll,
} from '../headless/frontend-cache-revalidate';
import { getParentPath } from '../utils/nav-utils';
import { getNodeVersions } from '../time-travel/version-utils';
import { runInBranchContext } from '../utils/branch-context';
import { handleScheduledPublish } from './scheduled-publish';
import { contentRepo } from '../constants';
import { PrepublishCacheWipeConfig } from '../../tasks/prepublish-cache-wipe/prepublish-cache-wipe-config';
import { addReliableEventListener } from '../events/reliable-custom-events';
import { findReferences } from './references';
import { wipeSiteinfoCache } from '../controllers/site-info';

export type NodeEventData = {
    id: string;
    path: string;
    branch: string;
    repo: string;
};

export const cacheInvalidateEventName = 'invalidate-cache';
export const prepublishInvalidateEvent = 'prepublish-invalidate';

// Define site path as a literal, because portal.getSite() can't be called from main.js
const sitePath = '/www.nav.no/';
const redirectPath = '/redirects/';

// Matches [/content]/www.nav.no/* and [/content]/redirects/*
const pathnameFilter = new RegExp(`^(/content)?(${redirectPath}|${sitePath})`);

const getPathname = (path: string) => path.replace(pathnameFilter, '/');

const generateEventId = (nodeData: NodeEventData, timestamp: number) =>
    `${nodeData.id}-${timestamp}`;

const wipeSitecontentEntry = (nodePath: string, eventId: string) => {
    if (!nodePath) {
        return;
    }

    const pathname = getPathname(nodePath);
    log.info(`Clearing cache for ${pathname}`);

    frontendCacheRevalidate(pathname, eventId);
};

const wipeNotificationsEntry = (nodePath: string, eventId: string) => {
    if (!nodePath) {
        return;
    }

    const parentCacheKey = getPathname(getParentPath(nodePath));
    log.info(`Clearing notifications from ${parentCacheKey}`);
    frontendCacheRevalidate(parentCacheKey, eventId);
};

const wipeSpecialCases = (nodePath: string) => {
    // When a template is updated we need to wipe all caches
    if (nodePath.includes('_templates/')) {
        log.info('Clearing whole cache due to updated template');
        frontendCacheWipeAll();
        return true;
    }

    // If global notifications are modified, every page is potentially affected
    if (nodePath.includes('/global-notifications/')) {
        log.info('Clearing whole cache due to updated global notification');
        frontendCacheWipeAll();
        return true;
    }

    return false;
};

export const wipeSitecontentEntryWithReferences = (
    node: NodeEventData,
    eventId: string,
    eventType?: string
) => {
    const { id, path } = node;

    wipeSitecontentEntry(path, eventId);
    wipeNotificationsEntry(path, eventId);

    const references = findReferences({ id, eventType });

    log.info(
        `Clearing ${references.length} references for ${path}: ${JSON.stringify(
            references.map((item) => item._path),
            null,
            4
        )}`
    );

    references.forEach((item) => {
        wipeSitecontentEntry(item._path, eventId);
    });
};

const wipePreviousIfPathChanged = (node: NodeEventData, eventId: string) => {
    const repo = nodeLib.connect({
        repoId: node.repo || contentRepo,
        branch: 'master',
    });

    const previousVersion = getNodeVersions({ nodeKey: node.id, repo, branch: 'master' })?.[1];

    if (previousVersion) {
        const previousPath = getPathname(previousVersion.nodePath);
        const currentPath = getPathname(node.path);

        if (previousPath !== currentPath) {
            log.info(
                `Path changed for ${node.id}, wiping cache with old path key - Previous path: ${previousPath} - New path: ${currentPath}`
            );
            wipeSitecontentEntry(previousPath, eventId);
            wipeNotificationsEntry(previousPath, eventId);
        }
    }
};

export const wipeCacheForNode = (node: NodeEventData, eventType: string, timestamp: number) => {
    const didWipe = wipeSpecialCases(node.path);
    if (didWipe) {
        return;
    }

    const eventId = generateEventId(node, timestamp);

    runInBranchContext(() => {
        wipePreviousIfPathChanged(node, eventId);
        wipeSitecontentEntryWithReferences(node, eventId, eventType);
    }, 'master');
};

const nodeListenerCallback = (event: EnonicEvent) => {
    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === contentRepo) {
            const isPrepublished = handleScheduledPublish(node, event.type);

            if (!isPrepublished) {
                wipeCacheForNode(node, event.type, event.timestamp);
            }
        }
    });
    wipeSiteinfoCache();
};

const prepublishCallback = (event: EnonicEvent<PrepublishCacheWipeConfig>) => {
    log.info(`Clearing cache for prepublished content: ${event.data.path}`);
    wipeCacheForNode(
        { ...event.data, branch: 'master', repo: contentRepo },
        event.type,
        event.timestamp
    );
    wipeSiteinfoCache();
};

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
                log.info(`Received event for cache invalidating of ${path} - ${id}`);
                runInBranchContext(
                    () => wipeSitecontentEntryWithReferences(event.data, eventId),
                    'master'
                );
            },
        });

        log.info('Started: Cache eventListener on node events');
        hasSetupListeners = true;
    } else {
        log.info('Cache node listeners already running');
    }
};
