import cacheLib from '/lib/cache';
import eventLib, { EnonicEventData, EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import {
    frontendCacheRevalidate,
    frontendCacheWipeAll,
} from '../headless/frontend-cache-revalidate';
import { getParentPath } from '../utils/nav-utils';
import { ArrayItem } from '../../types/util-types';
import { getNodeVersions } from '../time-travel/version-utils';
import { runInBranchContext } from '../utils/branch-context';
import { generateUUID, isUUID } from '../utils/uuid';
import { handleScheduledPublish } from './scheduled-publish';
import { contentRepo } from '../constants';
import { PrepublishCacheWipeConfig } from '../../tasks/prepublish-cache-wipe/prepublish-cache-wipe-config';
import { addReliableEventListener } from '../events/reliable-custom-events';
import { findReferences } from './references';

type CallbackFunc = () => any;

export type NodeEventData = ArrayItem<EnonicEventData['nodes']>;

const cacheId = generateUUID();

log.info(`Cache ID for this instance: ${cacheId}`);

const oneDay = 3600 * 24;
const oneMinute = 60;

const caches = {
    decorator: cacheLib.newCache({
        size: 50,
        expire: oneMinute,
    }),
    driftsmeldinger: cacheLib.newCache({
        size: 50,
        expire: oneMinute,
    }),
    sitecontent: cacheLib.newCache({
        size: 5000,
        expire: oneDay,
    }),
    notifications: cacheLib.newCache({
        size: 5000,
        expire: oneDay,
    }),
};

type CacheName = keyof typeof caches;

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

const getCacheValue = (cacheName: CacheName, key: string, callback: CallbackFunc) => {
    try {
        return caches[cacheName].get(key, callback);
    } catch (e) {
        // cache.get function throws if callback returns null
        return null;
    }
};

export const getDecoratorMenuCache = (branch: RepoBranch, callback: CallbackFunc) => {
    if (branch === 'draft') {
        return callback();
    }

    return getCacheValue('decorator', 'decorator', callback);
};

export const getDriftsmeldingerCache = (
    language: string,
    branch: RepoBranch,
    callback: CallbackFunc
) => {
    if (branch === 'draft') {
        return callback();
    }

    return getCacheValue('driftsmeldinger', `driftsmelding-heading-${language}`, callback);
};

export const getSitecontentCache = (
    idOrPath: string,
    branch: RepoBranch,
    callback: CallbackFunc
) => {
    // Do not cache draft branch or content id requests
    if (branch === 'draft' || isUUID(idOrPath)) {
        return callback();
    }

    const cacheKey = getPathname(idOrPath);
    return getCacheValue('sitecontent', cacheKey, callback);
};

export const getNotificationsCache = (idOrPath: string, callback: CallbackFunc) => {
    if (isUUID(idOrPath)) {
        return callback();
    }

    const cacheKey = getPathname(idOrPath);
    return getCacheValue('notifications', cacheKey, callback);
};

export const wipeAllCaches = () => {
    log.info(`Wiping all caches on [${cacheId}]`);
    Object.keys(caches).forEach((name) => wipeCache(name as CacheName));
};

const wipeCache = (name: CacheName) => {
    log.info(`Wiping all entries in [${name} (${caches[name].getSize()})] on [${cacheId}]`);
    caches[name].clear();
};

const wipeCacheEntry = (name: CacheName, key: string) => {
    caches[name].remove(key);
};

const wipeSitecontentEntry = (nodePath: string, eventId: string) => {
    if (!nodePath) {
        return;
    }

    const pathname = getPathname(nodePath);
    log.info(`Clearing cache for ${pathname}`);

    wipeCacheEntry('sitecontent', pathname);
    frontendCacheRevalidate(pathname, eventId);
};

const wipeNotificationsEntry = (nodePath: string, eventId: string) => {
    if (!nodePath) {
        return;
    }

    const parentCacheKey = getPathname(getParentPath(nodePath));
    log.info(`Clearing notifications from ${parentCacheKey}`);
    wipeCacheEntry('notifications', parentCacheKey);
    frontendCacheRevalidate(parentCacheKey, eventId);
};

const wipeSpecialCases = (nodePath: string) => {
    // When a template is updated we need to wipe all caches
    if (nodePath.includes('_templates/')) {
        log.info(`All caches cleared due to updated template on [${cacheId}]`);
        wipeCache('sitecontent');
        frontendCacheWipeAll();
        return true;
    }

    // Wipe cache for decorator service notifications
    if (nodePath.includes('/driftsmeldinger/')) {
        wipeCache('driftsmeldinger');
        return true;
    }

    // Wipe cache for decorator menu
    if (nodePath.includes('/dekorator-meny/')) {
        wipeCache('decorator');
        return true;
    }

    // If global notifications are modified, every page is potentially affected
    if (nodePath.includes('/global-notifications/')) {
        log.info(`Global notification modified, wiping notifications cache and frontend cache`);
        wipeCache('notifications');
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

    // TODO: remove type assertion when findReferences has been rewritten to TS
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
            const isPrepublished = handleScheduledPublish(node, event);

            if (!isPrepublished) {
                wipeCacheForNode(node, event.type, event.timestamp);
            }
        }
    });
};

const prepublishCallback = (event: EnonicEvent<PrepublishCacheWipeConfig>) => {
    log.info(`Prepublish invalidate event: ${JSON.stringify(event)}`);
    wipeCacheForNode(
        { ...event.data, branch: 'master', repo: contentRepo },
        event.type,
        event.timestamp
    );
};

let hasSetupListeners = false;

export const activateCacheEventListeners = () => {
    wipeAllCaches();

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
                const { id, path } = event.data;
                log.info(`Received event for cache invalidating of ${path} - ${id}`);
                runInBranchContext(
                    () =>
                        wipeSitecontentEntryWithReferences(
                            event.data,
                            generateEventId(event.data, event.timestamp)
                        ),
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
