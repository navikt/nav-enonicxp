const libs = {
    cache: require('/lib/cache'),
    event: require('/lib/xp/event'),
    context: require('/lib/xp/context'),
    content: require('/lib/xp/content'),
    common: require('/lib/xp/common'),
};
const oneDay = 3600 * 24;
let etag = Date.now().toString(16);
let hasSetupListeners = false;
const myHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
log.info(`Creating new cache: ${myHash}`);

const cacheInvalidatorEvents = ['node.pushed', 'node.deleted'];
const caches = {
    decorator: libs.cache.newCache({
        size: 50,
        expire: oneDay,
    }),
    azList: libs.cache.newCache({
        size: 100,
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
};

module.exports = {
    wipeDecorator: wipe('decorator'),
    wipePaths: wipe('paths'),
    getDecorator: getSome('decorator'),
    getAZList: getSome('azList'),
    getPaths: getSome('paths'),
    getRedirects: getSome('redirects'),
    activateEventListener,
    wipeAll,
    stripPath: getPath,
    etag: getEtag,
    wipeOnChange,
    clearReferences,
};

function getPath (path, type) {
    if (!path) {
        return;
    }
    const arr = path.split('/www.nav.no/');
    // remove / from start of key. Because of how the vhost changes the url on the server,
    // we won't have www.nav.no in the path and the key ends up starting with a /
    let key = arr[arr.length - 1];


    if (key[0] === '/') {
        key = key.replace('/', '');
    }
    /* Siden path kan være så forskjellige for samme innhold så kapper vi path array til det som er relevant */
    /* Funksjonen er idempotent slik at getPath(path) === getPath(getPath(path)) */

    // need to sanitize the paths, since some contain norwegian chars
    key = libs.common.sanitize(key);

    return (type ? type + '::' : '') + key;
}

function getEtag () {
    return etag;
}

function setEtag () {
    etag = Date.now().toString(16);
}

function wipeAll () {
    setEtag();
    wipe('decorator')();
    wipe('azList')();
    wipe('paths')();
}

function wipe (name) {
    return key => {
        if (!key) {
            caches[name].clear();
            log.info(`Removed [ALL] in [${name} (${caches[name].getSize()})] on [${myHash}]`);
        } else {
            caches[name].remove(key);
            log.info(`Removed [${key}] in [${name} (${caches[name].getSize()})] on [${myHash}]`);
        }
    }
}

function wipeOnChange (path) {
    if (!path) {
        return false;
    }

    const w = wipe('paths');
    w(getPath(path, 'main-page'));
    w(getPath(path, 'main-article'));
    w(getPath(path, 'main-article-linked-list'));
    w(getPath(path, 'menu-list'));
    w(getPath(path, 'section-page'));
    w(getPath(path, 'page-list'));
    w(getPath(path, 'transport'));
    w(getPath(path, 'office-information'));
    w(getPath(path, 'page-large-table'));
    if (path.indexOf('/driftsmeldinger/') !== -1) {
        w('driftsmelding-heading');
    }
    if (path.indexOf('/publiseringskalender/') !== -1) {
        w('publiseringskalender');
    }
    if (path.indexOf('/megamenu/') !== -1) {
        wipe('decorator')();
    }
    if (path.indexOf('/megamenu/') !== -1 || path.indexOf('/en/content-a-z/') !== -1 || path.indexOf('/no/innhold-a-aa/') !== -1) {
        wipe('azList')();
    }
    if (path.indexOf('/content/redirects/') !== -1) {
        wipe('redirects')();
    }
}

function getSome (cacheStoreName) {
    return (key, type, branch, f, params) => {
        /* Vil ikke cache innhold på draft */
        if (branch !== 'draft' || cacheStoreName === 'decorator') {
            return caches[cacheStoreName].get(getPath(key, type), function () {
                log.info(`Store [${getPath(key, type)}] in [${cacheStoreName} (${caches[cacheStoreName].getSize()})] on [${myHash}]`);
                return f(params);
            });
        } else {
            return f(params);
        }
    };
}

function activateEventListener () {
    wipeAll();
    if (!hasSetupListeners) {
        libs.event.listener({
            type: 'node.*',
            localOnly: false,
            callback: nodeListenerCallback,
        });
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
        hasSetupListeners = true;
    } else {
        log.info('Cache node listeners already running');
    }
}

function nodeListenerCallback (event) {
    // Stop execution if not valid event type.
    const shouldRun = cacheInvalidatorEvents.filter(
        eventType => event.type === eventType
    );
    if (!shouldRun) {
        return false;
    }

    event.data.nodes.forEach(function (node) {
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
        } else if (node.path.indexOf('/megamenu/') !== -1) {
            wipe('decorator')();
        }
    });
    return true;
}

function clearReferences (id, path, depth) {
    if (depth > 10) {
        log.info('REACHED MAX DEPTH OF 10 IN CACHE CLEARING');
        return;
    }
    const references = libs.content.query({
        start: 0,
        count: 1000,
        query: `_references LIKE "${id}"`,
    }).hits;

    // fix path before getting parent
    if (path.indexOf('/content/') === 0) {
        path = path.replace('/content', '');
    }

    // get parent
    const parent = libs.content.get({
        key: path.split('/').slice(0, -1).join('/'),
    });

    // remove parents cache if its of a type that autogenerates content based on children and not reference
    const parentTypesToClear = [
        `${app.name}:page-list`,
        `${app.name}:main-article`,
    ];
    if (parent && parentTypesToClear.indexOf(parent.type) !== -1) {
        log.info('REMOVE PARENT CACHE');
        references.push(parent);
    }

    references.forEach(el => {
        wipeOnChange(el._path);

        const deepTypes = [`${app.name}:content-list`];
        if (deepTypes.indexOf(el.type) !== -1) {
            clearReferences(el._id, el._path, depth + 1);
        }
    });
}
