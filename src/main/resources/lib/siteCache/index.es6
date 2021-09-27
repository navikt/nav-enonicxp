const contentLib = require('/lib/xp/content');
const { frontendCacheWipeAll } = require('/lib/headless/frontend-cache-revalidate');
const { removeDuplicates } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { globalValuesContentType } = require('/lib/global-values/global-values');
const { findContentsWithProductCardMacro } = require('/lib/htmlarea/htmlarea');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');
const { forceArray } = require('/lib/nav-utils');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');
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

// Define site path as a literal, because portal.getSite() cant´t be called from main.js
const sitePath = '/www.nav.no/';
const redirectPath = '/redirects/';

// Matches [/content]/www.nav.no/* and [/content]/redirects/*
const pathnameFilter = new RegExp(`^(/content)?(${redirectPath}|${sitePath})`);

const oneDay = 3600 * 24;

let hasSetupListeners = false;
const myHash =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

log.info(`Creating new cache: ${myHash}`);
const cacheInvalidatorEvents = ['node.pushed', 'node.deleted'];
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

function getPath(path, type) {
    if (!path) {
        return false;
    }
    const arr = path.split(sitePath);
    // remove / from start of key. Because of how the vhost changes the url on the server,
    // we won't have www.nav.no in the path and the key ends up starting with a /
    let key = arr[arr.length - 1];

    if (key[0] === '/') {
        key = key.replace('/', '');
    }
    /* Siden path kan være så forskjellige for samme innhold så kapper vi path
     * array til det som er relevant */
    /* Funksjonen er idempotent slik at getPath(path) === getPath(getPath(path)) */

    // need to sanitize the paths, since some contain norwegian chars
    key = libs.common.sanitize(key);

    return (type ? type + '::' : '') + key;
}

function wipe(name) {
    return (key) => {
        if (!key) {
            caches[name].clear();
            log.info(`WIPE: [ALL] in [${name} (${caches[name].getSize()})] on [${myHash}]`);
        } else {
            caches[name].remove(key);
        }
    };
}

function wipeAll() {
    Object.keys(caches).forEach((name) => wipe(name)());
}

function getPathname(path) {
    return path.replace(pathnameFilter, '/');
}

function wipeOnChange(path) {
    if (!path) {
        return false;
    }

    const pathname = getPathname(path);
    log.info(`Clearing: ${pathname}`);

    // When a template is updated we need to wipe all caches
    if (path.indexOf('_templates/') !== -1) {
        wipeAll();
        log.info(
            `WIPED: [${pathname}] - All caches cleared due to updated template on [${myHash}]`
        );
        return true;
    }

    // Wipe cache for decorator services
    if (path.indexOf('/driftsmeldinger/') !== -1) {
        const w = wipe('driftsmeldinger');
        w('driftsmelding-heading-no');
        w('driftsmelding-heading-en');
        w('driftsmelding-heading-se');
        return true;
    }
    if (path.indexOf('/dekorator-meny/') !== -1) {
        wipe('decorator')();
        return true;
    }

    // Wipe cache for frontend sitecontent service
    wipe('sitecontent')(pathname);
    frontendCacheRevalidate(pathname);

    const xpPath = path.replace(/^\/content/, '');
    updateSitemapEntry(xpPath);

    return true;
}

function getSome(cacheStoreName) {
    return (key, type, branch, f, params) => {
        /* Vil ikke cache innhold på draft */
        if (branch !== 'draft') {
            return caches[cacheStoreName].get(getPath(key, type), () => f(params));
        }
        return f(params);
    };
}

function getSitecontent(idOrPath, branch, callback) {
    // Do not cache draft branch or content id requests
    if (branch === 'draft' || isUUID(idOrPath)) {
        return callback();
    }
    try {
        return caches['sitecontent'].get(getPathname(idOrPath), callback);
    } catch (e) {
        // cache functions throws if callback returns null
        return null;
    }
}

function getNotifications(idOrPath, callback) {
    if (isUUID(idOrPath)) {
        return callback();
    }
    try {
        return caches['notifications'].get(getPathname(idOrPath), callback);
    } catch (e) {
        return null;
    }
}

function findReferences(id, path, depth) {
    log.info(`Find references for: ${path}`);
    let newPath = path;
    if (depth > 10) {
        log.info('REACHED MAX DEPTH OF 10 IN CACHE CLEARING');
        return [];
    }
    let references = libs.content.query({
        start: 0,
        count: 1000,
        query: `_references LIKE "${id}"`,
    }).hits;

    // if there are references which have indirect references we need to invalidate their
    // references as well
    const deepTypes = [
        `${app.name}:notification`,
        `${app.name}:main-article-chapter`,
        `${app.name}:content-list`,
        `${app.name}:breaking-news`,
    ];

    const deepReferences = references.reduce((acc, ref) => {
        if (ref?.type && deepTypes.indexOf(ref.type) !== -1) {
            return [...acc, ...findReferences(ref._id, ref._path, depth + 1)];
        }
        return acc;
    }, []);
    references = [...references, ...deepReferences];

    // fix path before getting parent
    if (path.indexOf('/content/') === 0) {
        newPath = path.replace('/content', '');
    }

    // get parent
    const parent = libs.content.get({
        key: newPath.split('/').slice(0, -1).join('/'),
    });

    // remove parents cache if its of a type that autogenerates content based on
    // children and not reference
    const parentTypesToClear = [
        `${app.name}:page-list`,
        `${app.name}:main-article`,
        `${app.name}:publishing-calendar`,
        `${app.name}:section-page`,
    ];

    if (parent && parentTypesToClear.indexOf(parent.type) !== -1) {
        references.push(parent);
        // If the parent has chapters we need to clear the cache of all other chapters as well
        const chapters = libs.content
            .getChildren({ key: parent._id })
            .hits.filter((item) => item.type === `${app.name}:main-article-chapter`);
        chapters.forEach((chapter) => {
            if (chapter._id !== id) {
                references.push(chapter);
            }
        });
    }

    return removeDuplicates(
        references.filter((ref) => !!ref._path),
        (a, b) => a._path === b._path
    );
}

function clearFragmentMacroReferences(content) {
    if (content.type !== 'portal:fragment') {
        return;
    }

    const { _id } = content;

    const contentsWithFragmentId = findContentsWithFragmentMacro(_id);
    if (!contentsWithFragmentId?.length > 0) {
        return;
    }

    log.info(
        `Wiping ${contentsWithFragmentId.length} cached pages with references to fragment id ${_id}`
    );

    contentsWithFragmentId.forEach((contentWithFragment) =>
        wipeOnChange(contentWithFragment._path)
    );
}

const productCardTargetTypes = {
    [`${app.name}:content-page-with-sidemenus`]: true,
    [`${app.name}:situation-page`]: true,
    [`${app.name}:tools-page`]: true,
};

function clearProductCardMacroReferences(content) {
    if (!productCardTargetTypes[content.type]) {
        return;
    }

    const { _id } = content;

    const contentsWithProductCardMacro = findContentsWithProductCardMacro(_id);
    if (!contentsWithProductCardMacro?.length > 0) {
        return;
    }

    log.info(
        `Wiping ${contentsWithProductCardMacro.length} cached pages with references to product page ${_id}`
    );

    contentsWithProductCardMacro.forEach((contentWithMacro) =>
        wipeOnChange(contentWithMacro._path)
    );
}

function clearGlobalValueReferences(content) {
    if (content.type !== globalValuesContentType) {
        return;
    }

    forceArray(content.data?.valueItems).forEach((item) => {
        getGlobalValueUsage(item.key, content._id).forEach((contentWithValues) => {
            wipeOnChange(contentWithValues.path);
        });
    });
}

function clearNotificationReferences(content) {
    if (content.type !== `${app.name}:notification`) {
        return;
    }

    // If the notification is shown globally, wipe the whole cache
    if (content._path.includes('/global-notifications/')) {
        wipe('notifications')();

        frontendCacheWipeAll();
        return;
    }

    // Non-global notifications are only displayed on the parent
    const parentPath = getPathname(content._path.split('/').slice(0, -1).join('/'));
    log.info(`Clearing notifications from ${parentPath}`);
    wipe('notifications')(parentPath);

    frontendCacheRevalidate(getPathname(parentPath));
}

function clearReferences(id, path, depth, event) {
    const references = findReferences(id, path, depth);
    if (references && references.length > 0) {
        log.info(
            `Clear references: ${JSON.stringify(
                references.map((item) => item._path),
                null,
                4
            )}`
        );
    }

    references.forEach((el) => {
        wipeOnChange(el._path);
    });

    const content = runInBranchContext(
        () => contentLib.get({ key: id }),
        event === 'node.deleted' ? 'draft' : 'master'
    );
    if (!content) {
        return;
    }

    clearNotificationReferences(content);
    clearFragmentMacroReferences(content);
    clearProductCardMacroReferences(content);
    clearGlobalValueReferences(content);
}

function nodeListenerCallback(event) {
    // Stop execution if not valid event type.
    const shouldRun = cacheInvalidatorEvents.filter((eventType) => event.type === eventType);
    if (!shouldRun) {
        return false;
    }

    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === 'com.enonic.cms.default') {
            wipeOnChange(node.path);
            libs.context.run(
                {
                    repository: 'com.enonic.cms.default',
                    branch: 'master',
                    user: {
                        login: 'su',
                        userStore: 'system',
                    },
                    principals: ['role:system.admin'],
                },
                () => {
                    clearReferences(node.id, node.path, 0, event.type);
                }
            );
        } else if (node.path.indexOf('/dekorator-meny/') !== -1) {
            wipe('decorator')();
        }
    });

    return true;
}

function activateEventListener() {
    wipeAll();
    if (!hasSetupListeners) {
        libs.event.listener({
            type: 'node.*',
            localOnly: false,
            callback: nodeListenerCallback,
        });
        log.info('Started: Cache eventListener on node.updated');
        libs.event.listener({
            type: 'custom.prepublish',
            localOnly: false,
            callback: (e) => {
                e.data.prepublished.forEach((el) => {
                    wipeOnChange(el._path);
                    clearReferences(el._id, el._path, 0);
                });
            },
        });
        log.info('Started: Cache eventListener on custom.prepublish');
        hasSetupListeners = true;
    } else {
        log.info('Cache node listeners already running');
    }
}

module.exports = {
    getDecorator: getSome('decorator'),
    getDriftsmeldinger: getSome('driftsmeldinger'),
    getSitecontent,
    getNotifications,
    activateEventListener,
};
