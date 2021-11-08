const { findReferences } = require('/lib/siteCache/findReferences');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getParentPath } = require('/lib/nav-utils');
const { frontendCacheWipeAll } = require('/lib/headless/frontend-cache-revalidate');
const { updateSitemapEntry } = require('/lib/sitemap/sitemap');
const { isUUID } = require('/lib/headless/uuid');
const { frontendCacheRevalidate } = require('/lib/headless/frontend-cache-revalidate');

const libs = {
    cache: require('/lib/cache'),
    event: require('/lib/xp/event'),
    context: require('/lib/xp/context'),
    content: require('/lib/xp/content'),
    common: require('/lib/xp/common'),
};

let hasSetupListeners = false;
const myHash =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

log.info(`Creating new cache: ${myHash}`);

// Define site path as a literal, because portal.getSite() cant´t be called from main.js
const sitePath = '/www.nav.no/';
const redirectPath = '/redirects/';

// Matches [/content]/www.nav.no/* and [/content]/redirects/*
const pathnameFilter = new RegExp(`^(/content)?(${redirectPath}|${sitePath})`);

const oneDay = 3600 * 24;

const caches = {
    decorator: libs.cache.newCache({
        size: 50,
        expire: oneDay,
    }),
    driftsmeldinger: libs.cache.newCache({
        size: 50,
        expire: oneDay,
    }),
    sitecontent: libs.cache.newCache({
        size: 5000,
        expire: oneDay,
    }),
    notifications: libs.cache.newCache({
        size: 5000,
        expire: oneDay,
    }),
};

const wipe = (name) => {
    return (key) => {
        if (!key) {
            caches[name].clear();
            log.info(`WIPE: [ALL] in [${name} (${caches[name].getSize()})] on [${myHash}]`);
        } else {
            caches[name].remove(key);
        }
    };
};

const wipeAll = () => {
    Object.keys(caches).forEach((name) => wipe(name)());
};

const getPathname = (path) => path.replace(pathnameFilter, '/');

const wipeCacheForNodePath = (nodePath) => {
    if (!nodePath) {
        return false;
    }

    const pathname = getPathname(nodePath);
    log.info(`Clearing cache for ${pathname}`);

    // When a template is updated we need to wipe all caches
    if (nodePath.includes('_templates/')) {
        wipeAll();
        log.info(
            `WIPED: [${pathname}] - All caches cleared due to updated template on [${myHash}]`
        );
        return true;
    }

    // Wipe cache for decorator services
    if (nodePath.includes('/driftsmeldinger/')) {
        wipe('driftsmeldinger')();
        return true;
    }
    if (nodePath.includes('/dekorator-meny/')) {
        wipe('decorator')();
        return true;
    }

    // If global notifications are modified, every page is potentially affected
    // Wipe the whole cache
    if (nodePath.includes('/global-notifications/')) {
        log.info(`Global notification modified, wiping notifications cache and frontend cache`);
        wipe('notifications')();
        frontendCacheWipeAll();
        return true;
    }

    // Wipe cache for frontend sitecontent service
    wipe('sitecontent')(pathname);
    frontendCacheRevalidate(pathname);

    const xpPath = nodePath.replace(/^\/content/, '');
    updateSitemapEntry(xpPath);

    return true;
};

const getDecoratorMenuCache = (branch, callback) => {
    if (branch === 'draft') {
        return callback();
    }

    return caches.decorator.get('decorator', callback);
};

const getDriftsmeldingerCache = (language, branch, callback) => {
    if (branch === 'draft') {
        return callback();
    }

    return caches.driftsmeldinger.get(`driftsmelding-heading-${language}`, callback);
};

const getSitecontentCache = (idOrPath, branch, callback) => {
    // Do not cache draft branch or content id requests
    if (branch === 'draft' || isUUID(idOrPath)) {
        return callback();
    }

    try {
        return caches.sitecontent.get(getPathname(idOrPath), callback);
    } catch (e) {
        // cache functions throws if callback returns null
        return null;
    }
};

const getNotificationsCache = (idOrPath, callback) => {
    if (isUUID(idOrPath)) {
        return callback();
    }
    try {
        return caches.notifications.get(getPathname(idOrPath), callback);
    } catch (e) {
        return null;
    }
};

const wipeNotificationsEntry = (nodePath) => {
    const path = getPathname(getParentPath(nodePath));
    log.info(`Clearing notifications from ${path}`);
    wipe('notifications')(path);
    frontendCacheRevalidate(path);
};

const clearReferences = (id, nodePath, depth, event) => {
    const references = findReferences(id, nodePath, event === 'node.deleted' ? 'draft' : 'master');

    if (references && references.length > 0) {
        log.info(
            `Clear references: ${JSON.stringify(
                references.map((item) => item._path),
                null,
                4
            )}`
        );

        references.forEach((item) => {
            wipeCacheForNodePath(item._path);
        });
    }
};

const nodeListenerCallback = (event) => {
    log.info(`Event: ${JSON.stringify(event)}`);

    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === 'com.enonic.cms.default') {
            wipeCacheForNodePath(node.path);
            wipeNotificationsEntry(node.path);

            runInBranchContext(() => {
                clearReferences(node.id, node.path, 0, event.type);
            }, 'master');
        } else if (node.path.includes('/dekorator-meny/')) {
            wipe('decorator')();
        }
    });
};

const activateCacheEventListeners = () => {
    wipeAll();

    if (!hasSetupListeners) {
        libs.event.listener({
            type: '(node.pushed|node.deleted)',
            localOnly: false,
            callback: nodeListenerCallback,
        });
        log.info('Started: Cache eventListener on node.updated');

        libs.event.listener({
            type: 'custom.prepublish',
            localOnly: false,
            callback: (e) => {
                e.data.prepublished.forEach((el) => {
                    wipeCacheForNodePath(el._path);
                    clearReferences(el._id, el._path, 0);
                });
            },
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
};
