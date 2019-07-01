var cache = require('/lib/cache');
var event = require('/lib/xp/event');
var standardCache = {
    size: 1000,
    expire: 3600 * 24, /* One day */
};
var etag = Date.now().toString(16);
var nodeLib = require('/lib/xp/node');
var repo = nodeLib.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'master',
    principals: ['role:system.admin'],
});
var caches = {
    decorator: cache.newCache(standardCache),
    paths: cache.newCache(standardCache),
};
module.exports = {
    wipeDecorator: wipe('decorator'),
    wipePaths: wipe('paths'),
    getDecorator: getSome('decorator'),
    getPaths: getSome('paths'),
    activateEventListener: activateEventListener,
    wipeAll: wipeAll,
    stripPath: getPath,
    etag: getEtag,
};

function getPath (path, type) {
    if (!path) { return; }
    var arr = path.split('/www.nav.no/');
    // remove / from start of key. Because of how the vhost changes the url on the server,
    // we won't have www.nav.no in the path and the key ends up starting with a /
    var key = arr[arr.length - 1];
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
    wipe('paths')();
}

function wipe (name) {
    return function (key) {
        if (!key) {
            log.info('Cache remove complete cache ' + name);
            caches[name].clear();
        } else {
            log.info('Cache remove key ' + key);
            caches[name].remove(key);
        }
    };
}

function wipeOnChange (path) {
    var w = wipe('paths');
    if (path) {
        log.info('WIPE: ' + getPath(path) + ' ~ ' + path);
        w(getPath(path, 'megamenu-item'));
        w(getPath(path, 'main-article'));
        w(getPath(path, 'main-article-linked-list'));
        w(getPath(path, 'main-article-related-content'));
        w(getPath(path, 'oppslagstavle'));
        w(getPath(path, 'tavleliste'));
        w(getPath(path, 'tavleliste-relatert-innhold'));
        w(getPath(path, 'transport'));
        w(getPath(path, 'office-information'));
        w(getPath(path, 'ekstraStorTabell'));
        if (path.indexOf('/driftsmeldinger/') !== -1) {
            w('driftsmelding-heading');
        }
        if (path.indexOf('/publiseringskalender/') !== -1) {
            w('publiseringskalender');
        }
    }
}

function getSome (name) {
    return function (key, type, branch, f, params) {
        /* Vil ikke cache innhold på draft */
        if (branch !== 'draft') {
            return caches[name].get(getPath(key, type), function () {
                log.info('Store cache key: ' + getPath(key, type) + ' ~ ' + key);
                return f(params);
            });
        } else {
            log.info('Not from cache ' + getPath(key, type) + ' ~ ' + key);
            return f(params);
        }
    };
}

function activateEventListener () {
    wipeAll();
    event.listener({
        type: 'node.*',
        localOnly: false,
        callback: function (event) {
            event.data.nodes.forEach(function (node) {
                if (node.branch === 'master' && node.repo === 'com.enonic.cms.default') {
                    wipeOnChange(node.path);
                    repo.query({
                        start: 0,
                        count: 100,
                        branch: 'master',
                        query: "_references LIKE '" + node.id + "'",
                    }).hits.forEach(function (el) { wipeOnChange(el._path); });
                }
            });
        },
    });
}
