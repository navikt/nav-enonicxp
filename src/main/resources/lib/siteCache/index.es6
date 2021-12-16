const cacheLib = require('/lib/cache');
const eventLib = require('/lib/xp/event');
const { generateUUID } = require('/lib/headless/uuid');
const { findReferences } = require('/lib/siteCache/references');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getParentPath } = require('/lib/nav-utils');
const { frontendCacheWipeAll } = require('/lib/headless/frontend-cache-revalidate');
const { isUUID } = require('/lib/headless/uuid');
const { frontendCacheRevalidate } = require('/lib/headless/frontend-cache-revalidate');

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

// Define site path as a literal, because portal.getSite() cant´t be called from main.js
const sitePath = '/www.nav.no/';
const redirectPath = '/redirects/';

// Matches [/content]/www.nav.no/* and [/content]/redirects/*
const pathnameFilter = new RegExp(`^(/content)?(${redirectPath}|${sitePath})`);

const getPathname = (path) => path.replace(pathnameFilter, '/');

const getCacheValue = (cacheName, key, callback) => {
    try {
        return caches[cacheName].get(key, callback);
    } catch (e) {
        // cache.get function throws if callback returns null
        return null;
    }
};

const getDecoratorMenuCache = (branch, callback) => {
    if (branch === 'draft') {
        return callback();
    }

    return getCacheValue('decorator', 'decorator', callback);
};

const getDriftsmeldingerCache = (language, branch, callback) => {
    if (branch === 'draft') {
        return callback();
    }

    return getCacheValue('driftsmeldinger', `driftsmelding-heading-${language}`, callback);
};

const getSitecontentCache = (idOrPath, branch, callback) => {
    // Do not cache draft branch or content id requests
    if (branch === 'draft' || isUUID(idOrPath)) {
        return callback();
    }

    const cacheKey = getPathname(idOrPath);
    return getCacheValue('sitecontent', cacheKey, callback);
};

const getNotificationsCache = (idOrPath, callback) => {
    if (isUUID(idOrPath)) {
        return callback();
    }

    const cacheKey = getPathname(idOrPath);
    return getCacheValue('notifications', cacheKey, callback);
};

const wipeAll = () => {
    log.info(`Wiping all caches on [${cacheId}]`);
    Object.keys(caches).forEach((name) => wipeCache(name));
};

const wipeCache = (name) => {
    log.info(`Wiping all entries in [${name} (${caches[name].getSize()})] on [${cacheId}]`);
    caches[name].clear();
};

const wipeCacheEntry = (name, key) => {
    caches[name].remove(key);
};

const wipeSitecontentEntry = (nodePath) => {
    if (!nodePath) {
        return;
    }

    const pathname = getPathname(nodePath);
    log.info(`Clearing cache for ${pathname}`);

    wipeCacheEntry('sitecontent', pathname);
    frontendCacheRevalidate(pathname);
};

const wipeNotificationsEntry = (nodePath) => {
    if (!nodePath) {
        return;
    }

    const parentCacheKey = getPathname(getParentPath(nodePath));
    log.info(`Clearing notifications from ${parentCacheKey}`);
    wipeCacheEntry('notifications', parentCacheKey);
    frontendCacheRevalidate(parentCacheKey);
};

const wipeSpecialCases = (nodePath) => {
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

const wipeSitecontentEntryWithReferences = ({ id, path }) => {
    wipeSitecontentEntry(path);
    wipeNotificationsEntry(path);

    const references = findReferences(id);

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

const nodeListenerCallback = (event) => {
    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === 'com.enonic.cms.default') {
            const didWipe = wipeSpecialCases(node.path);
            if (didWipe) {
                return;
            }

            runInBranchContext(
                () => wipeSitecontentEntryWithReferences(node),
                event.type === 'node.deleted' ? 'draft' : 'master'
            );
        }
    });
};

const prepublishListenerCallback = (event) => {
    event.data.prepublished.forEach((node) => {
        runInBranchContext(() => wipeSitecontentEntryWithReferences(node), 'master');
    });
};

const activateCacheEventListeners = () => {
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

        hasSetupListeners = true;
    } else {
        log.info('Cache node listeners already running');
    }
};

module.exports = {
    getDecoratorMenuCache,
    getDriftsmeldingerCache,
    getSitecontentCache,
    getNotificationsCache,
    activateCacheEventListeners,
    wipeSitecontentEntryWithReferences,
};
