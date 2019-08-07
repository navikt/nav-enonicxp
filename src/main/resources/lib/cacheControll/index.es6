const libs = {
    cache: require('/lib/cache'),
    event: require('/lib/xp/event'),
    node: require('/lib/xp/node'),
};
const oneDay = 3600 * 24;
let etag = Date.now().toString(16);
const repo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'master',
    principals: ['role:system.admin'],
});
const caches = {
    decorator: libs.cache.newCache({ size: 50, expire: oneDay }),
    azList: libs.cache.newCache({ size: 100, expire: oneDay }),
    paths: libs.cache.newCache({ size: 5000, expire: oneDay }),
};
module.exports = {
    wipeDecorator: wipe('decorator'),
    wipePaths: wipe('paths'),
    getDecorator: getSome('decorator'),
    getAZList: getSome( 'azList'),
    getPaths: getSome('paths'),
    activateEventListener,
    wipeAll,
    stripPath: getPath,
    etag: getEtag,
};

function getPath (path, type) {
    if (!path) { return; }
    const arr = path.split('/www.nav.no/');
    // remove / from start of key. Because of how the vhost changes the url on the server,
    // we won't have www.nav.no in the path and the key ends up starting with a /
    let key = arr[arr.length - 1];
    if (key[0] === '/') {
        key = key.replace('/', '');
    }
    /* Siden path kan være så forskjellige for samme innhold så kapper vi path array til det som er relevant */
    /* Funksjonen er idempotent slik at getPath(path) === getPath(getPath(path)) */
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
            log.info('Remove complete cache [' + name + ']');
            caches[name].clear();
        } else {
            log.info('Cache [' + name + '] remove key: ' + key);
            caches[name].remove(key);
        }
    };
}

function wipeOnChange (path) {
    const w = wipe('paths');
    if (path) {
        log.info('WIPE: ' + getPath(path));
        w(getPath(path, 'main-article'));
        w(getPath(path, 'main-article-linked-list'));
        w(getPath(path, 'menu-list'));
        w(getPath(path, 'section-page'));
        w(getPath(path, 'page-list'));
        w(getPath(path, 'transport'));
        w(getPath(path, 'office-information'));
        w(getPath(path, 'ekstraStorTabell'));
        if (path.indexOf('/driftsmeldinger/') !== -1) {
            w('driftsmelding-heading');
        }
        if (path.indexOf('/publiseringskalender/') !== -1) {
            w('publiseringskalender');
        }
        if (path.indexOf('/megamenu/') !== -1) {
            wipe('decorator')();
        }
        if (path.indexOf('/megamenu/') !== -1 ||
            path.indexOf('/en/content-a-z/') !== -1 ||
            path.indexOf('/no/innhold-a-aa/') !== -1
        ) {
            wipe('azList')();
        }
    }
}

function getSome (name) {
    return (key, type, branch, f, params) => {
        /* Vil ikke cache innhold på draft */
        if (branch !== 'draft') {
            return caches[name].get(getPath(key, type), function () {
                log.info('Store cache [' + name + '] key: ' + getPath(key, type));
                return f(params);
            });
        } else {
            log.info('Not from cache [' + name + '] key: ' + getPath(key, type));
            return f(params);
        }
    };
}

function activateEventListener () {
    wipeAll();
    libs.event.listener({
        type: 'node.*',
        localOnly: false,
        callback: event => {
            event.data.nodes.forEach(function (node) {
                if (node.branch === 'master' && node.repo === 'com.enonic.cms.default') {
                    wipeOnChange(node.path);
                    repo.query({
                        start: 0,
                        count: 100,
                        branch: 'master',
                        query: "_references LIKE '" + node.id + "'",
                    }).hits
                        .forEach(el => {
                            wipeOnChange(el._path);
                        });
                }
            });
        },
    });
}
