import cacheLib from '/lib/cache';
import eventLib, { EnonicEventData, EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import {
    frontendCacheRevalidate,
    frontendCacheWipeAll,
} from '../headless/frontend-cache-revalidate';
import { getParentPath } from '../nav-utils';
import { ArrayItem } from '../../types/util-types';
import { getNodeVersions } from '../time-travel/version-utils';
import { runInBranchContext } from '../headless/branch-context';

const { findReferences } = require('/lib/siteCache/references');

type CallbackFunc = () => any;
type NodeEventData = ArrayItem<EnonicEventData['nodes']>;
type PrepublishEventData = {
    prepublished: NodeEventData[];
};

let hasSetupListeners = false;

const cacheId = generateUUID();

log.info(`Cache ID for this instance: ${cacheId}`);

const oneDay = 3600 * 24;

const caches = {
    decorator: cacheLib.newCache({
        size: 50,
        expire: oneDay,
    }),
    driftsmeldinger: cacheLib.newCache({
        size: 50,
        expire: oneDay,
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

// Define site path as a literal, because portal.getSite() can't be called from main.js
const sitePath = '/www.nav.no/';
const redirectPath = '/redirects/';

// Matches [/content]/www.nav.no/* and [/content]/redirects/*
const pathnameFilter = new RegExp(`^(/content)?(${redirectPath}|${sitePath})`);

const getPathname = (path: string) => path.replace(pathnameFilter, '/');

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

const wipeAll = () => {
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

const wipeSitecontentEntry = (nodePath: string) => {
    if (!nodePath) {
        return;
    }

    const pathname = getPathname(nodePath);
    log.info(`Clearing cache for ${pathname}`);

    wipeCacheEntry('sitecontent', pathname);
    frontendCacheRevalidate(pathname);
};

const wipeNotificationsEntry = (nodePath: string) => {
    if (!nodePath) {
        return;
    }

    const parentCacheKey = getPathname(getParentPath(nodePath));
    log.info(`Clearing notifications from ${parentCacheKey}`);
    wipeCacheEntry('notifications', parentCacheKey);
    frontendCacheRevalidate(parentCacheKey);
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

export const wipeSitecontentEntryWithReferences = (node: NodeEventData, eventType?: string) => {
    const { id, path } = node;

    wipeSitecontentEntry(path);
    wipeNotificationsEntry(path);

    const references = findReferences({ id, eventType }) as Content[];

    log.info(
        `Clearing ${references.length} references for ${path}: ${JSON.stringify(
            references.map((item) => item._path),
            null,
            4
        )}`
    );

    references.forEach((item) => {
        wipeSitecontentEntry(item._path);
    });
};

const wipePreviousIfPathChanged = (node: NodeEventData) => {
    const repo = nodeLib.connect({
        repoId: node.repo || 'com.enonic.cms.default',
        branch: 'master',
    });

    const previousPath = getNodeVersions({ nodeKey: node.id, repo, branch: 'master' })?.[1]
        ?.nodePath;

    if (previousPath && previousPath !== node.path) {
        log.info(
            `Node path changed for ${node.id}, wiping cache with old path key - Previous path: ${previousPath} - New path: ${node.path}`
        );
        wipeSitecontentEntry(previousPath);
        wipeNotificationsEntry(previousPath);
    }
};

const wipeCacheForNode = (node: NodeEventData, eventType: string) => {
    const didWipe = wipeSpecialCases(node.path);
    if (didWipe) {
        return;
    }

    runInBranchContext(() => {
        wipePreviousIfPathChanged(node);
        wipeSitecontentEntryWithReferences(node, eventType);
    }, 'master');
};

const nodeListenerCallback = (event: EnonicEvent) => {
    log.info(`Event: ${JSON.stringify(event)}`);
    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === 'com.enonic.cms.default') {
            wipeCacheForNode(node, event.type);
        }
    });
};

const prepublishListenerCallback = (event: EnonicEvent<PrepublishEventData>) => {
    event.data.prepublished.forEach((node) => {
        log.info(`Invalidating cache for prepublished content ${node.path}`);
        wipeCacheForNode(node, event.type);
    });
};

export const activateCacheEventListeners = () => {
    wipeAll();

    if (!hasSetupListeners) {
        eventLib.listener({
            type: '(node.pushed|node.deleted)',
            localOnly: false,
            callback: nodeListenerCallback,
        });
        log.info('Started: Cache eventListener on node events');

        eventLib.listener({
            type: 'custom.prepublish',
            localOnly: false,
            callback: prepublishListenerCallback,
        });
        log.info('Started: Cache eventListener on custom.prepublish');

        eventLib.listener<NodeEventData>({
            type: `custom.${cacheInvalidateEventName}`,
            localOnly: false,
            callback: (event) => {
                const { id, path } = event.data;
                log.info(`Received event for cache invalidating of ${path} - ${id}`);
                runInBranchContext(() => wipeSitecontentEntryWithReferences(event.data), 'master');
            },
        });

        hasSetupListeners = true;
    } else {
        log.info('Cache node listeners already running');
    }
};
