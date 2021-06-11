const contentLib = require('/lib/xp/content');
const { getCustomPathFromContent } = require('/lib/custom-paths/custom-paths');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');
const { updateSitemapEntry } = require('/lib/sitemap/sitemap');
const { isUUID } = require('/lib/headless/uuid');
const { frontendCacheRevalidate } = require('/lib/headless/frontend-cache-revalidate');

const libs = {
    cache: require('/lib/cache'),
    event: require('/lib/xp/event'),
    context: require('/lib/xp/context'),
    content: require('/lib/xp/content'),
    common: require('/lib/xp/common'),
    cluster: require('/lib/xp/cluster'),
    task: require('/lib/xp/task'),
};

// Define site path as a literal, because portal.getSite() cant´t be called from main.js
const sitePath = '/www.nav.no/';
const redirectPath = '/redirects/';

// Matches [/content]/www.nav.no/* and [/content]/redirects/*
const pathnameFilter = new RegExp(`^(/content)?(${redirectPath}|${sitePath})`);

const oneDay = 3600 * 24;
const oneMinute = 60;

let etag = Date.now().toString(16);
let hasSetupListeners = false;
const myHash =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

log.info(`Creating new cache: ${myHash}`);
const cacheInvalidatorEvents = ['node.pushed', 'node.deleted'];
const caches = {
    notificationsLegacy: libs.cache.newCache({
        size: 500,
        expire: oneMinute,
    }),
    decorator: libs.cache.newCache({
        size: 50,
        expire: oneDay,
    }),
    paths: libs.cache.newCache({
        size: 5000,
        expire: oneDay,
    }),
    redirects: libs.cache.newCache({
        size: 50,
        expire: oneDay,
    }),
    sitecontent: libs.cache.newCache({
        size: 5000,
        expire: oneDay,
    }),
    notifications: libs.cache.newCache({
        size: 500,
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

function getEtag() {
    return etag;
}

function setEtag() {
    etag = Date.now().toString(16);
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
    setEtag();
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
    const w = wipe('paths');
    w(getPath(path, 'main-page'));
    w(getPath(path, 'page-heading'));
    w(getPath(path, 'breaking-news'));
    w(getPath(path, 'main-panels'));
    w(getPath(path, 'link-panels'));
    w(getPath(path, 'link-lists'));
    w(getPath(path, 'main-article'));
    w(getPath(path, 'main-article-linked-list'));
    w(getPath(path, 'menu-list'));
    w(getPath(path, 'page-list'));
    w(getPath(path, 'office-information'));
    w(getPath(path, 'page-large-table'));
    w(getPath(path, 'faq-page'));
    w(getPath(path, 'generic-page'));
    if (path.indexOf('/driftsmeldinger/') !== -1) {
        w('driftsmelding-heading-no');
        w('driftsmelding-heading-en');
        w('driftsmelding-heading-se');
    }
    if (path.indexOf('/publiseringskalender') !== -1) {
        w('publiseringskalender');
    }
    if (path.indexOf('/dekorator-meny/') !== -1) {
        wipe('decorator')();
    }
    if (path.indexOf(redirectPath) !== -1) {
        wipe('redirects')();
    }

    // For headless setup
    wipe('sitecontent')(pathname);
    wipe('notifications')(pathname);
    if (path.indexOf('/global-notifications/') !== -1) {
        // Hvis det skjer en endring på et globalt varsel, må hele cachen wipes
        wipe('notifications')();
    }
    if (libs.cluster.isMaster()) {
        libs.task.submit({
            description: `send revalidate on ${pathname}`,
            task: () => {
                frontendCacheRevalidate(encodeURI(pathname));
            },
        });
    }

    updateSitemapEntry(pathname);

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
        `${app.name}:dynamic-page`,
        `${app.name}:content-page-with-sidemenus`,
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

    // remove duplicates and return all references
    const refPaths = references.map((i) => i._path);
    return references.filter((v, i) => !!v._path && refPaths.indexOf(v._path) === i);
}

function clearFragmentMacroReferences(id) {
    const fragment = contentLib.get({ key: id });
    if (!fragment || fragment.type !== 'portal:fragment') {
        return;
    }

    const contentsWithFragmentId = findContentsWithFragmentMacro(id);
    if (!contentsWithFragmentId?.length > 0) {
        return;
    }

    log.info(
        `Wiping ${contentsWithFragmentId.length} cached pages with references to fragment id ${id}`
    );

    contentsWithFragmentId.forEach((content) => wipeOnChange(content._path));
}

function clearCustomPathReferences(id) {
    const contentCustomPath = getCustomPathFromContent(id);
    if (contentCustomPath) {
        wipeOnChange(contentCustomPath);
    }
}

function clearReferences(id, path, depth) {
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

    clearCustomPathReferences(id);
    clearFragmentMacroReferences(id);
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
                    clearReferences(node.id, node.path, 0);
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
    wipeDecorator: wipe('decorator'),
    wipePaths: wipe('paths'),
    getDecorator: getSome('decorator'),
    getPaths: getSome('paths'),
    getRedirects: getSome('redirects'),
    getNotificationsLegacy: getSome('notificationsLegacy'),
    getSitecontent,
    getNotifications,
    activateEventListener,
    stripPath: getPath,
    etag: getEtag,
};
