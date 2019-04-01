var cache = require('/lib/cache');
var event = require('/lib/xp/event');
var standardCache = {
    size: 1000,
    expire: 3600 * 24 /* One day */
};
var etag = Date.now().toString(16);
var nodeLib = require('/lib/xp/node');
var repo = nodeLib.connect({
    repoId: 'cms-repo',
    branch: 'master',
    principals: ['role:system.admin']
});
var caches = {
    decorator: cache.newCache(standardCache),
    paths: cache.newCache(standardCache)
};
module.exports = {
    wipeDecorator: wipe('decorator'),
    wipePaths: wipe('paths'),
    getDecorator: getSome('decorator'),
    getPaths: getSome('paths'),
    activateEventListener: activateEventListener,
    wipeAll: wipeAll,
    stripPath: getPath,
    etag: getEtag
};

function getPath(path, type) {
    if (!path) return;
    var arr = path.split('/www.nav.no/');
    // remove / from start of key. Because of how the vhost changes the url on the server, 
    // we won't have www.nav.no in the path and the key ends up starting with a /
    var key = arr[arr.length - 1];
    if(key[0] === '/') {
        key = key.replace('/', '');
    }
    /* Siden path kan være så forskjellige for samme innhold så kapper vi path array til det som er relevant */
    /* Funksjonen er idempotent slik at getPath(path) === getPath(getPath(path)) */
    return (type ? type + '::' : '') + key;
}

function getEtag() {
    return etag;
}

function setEtag() {
    etag = Date.now().toString(16);
}

function wipeAll() {
    setEtag();
    wipe('decorator')();
    wipe('paths')();
}

function wipe(name) {
    return function(key) {
        if (!key) {
            log.info('Cache remove complete cache ' + name);
            caches[name].clear();
        } else {
            log.info('Cache remove key ' + key);
            caches[name].remove(key);
        }
    };
}

function wipeOnChange(value) {
    var wipee = repo.get(value.id);
    var w = wipe('paths');
    log.info('WIPE: ' + getPath(wipee._path) + ' ~ ' + wipee._path);
    w(getPath(wipee._path, 'megamenu-item'));
    w(getPath(wipee._path, 'main-article'));
    w(getPath(wipee._path, 'main-article-linked-list'));
    w(getPath(wipee._path, 'main-article-related-content'));
    w(getPath(wipee._path, 'oppslagstavle'));
    w(getPath(wipee._path, 'tavleliste'));
    w(getPath(wipee._path, 'tavleliste-relatert-innhold'));
    w(getPath(wipee._path, 'transport'));
}

function getSome(name) {
    return function(key, type, f, params) {
        /* Vil ikke cache innhold som redigeres */
        // TODO test for www-x adresser
        if (key.indexOf('/admin/portal/edit') === -1 && key.indexOf('/preview/draft') === -1) {
            return caches[name].get(getPath(key, type), function() {
                log.info('Store cache key: ' + getPath(key, type) + ' ~ ' + key);
                // log.info('Cache ' + name + ': ' + caches[name].getSize());
                return f(params);
            });
        } else {
            log.info('Not from cache ' + getPath(key, type) + ' ~ ' + key);
            return f(params);
        }
    };
}

function activateEventListener() {
    wipeAll();
    event.listener({
        type: 'node.*',
        localOnly: false,
        callback: function(event) {
            event.data.nodes.forEach(function(node) {
                if (node.branch === 'master') {
                    wipeOnChange(node);
                    repo.query({
                        start: 0,
                        count: 100,
                        branch: 'master',
                        query: "_references LIKE '" + node.id + "'"
                    }).hits.forEach(wipeOnChange);
                }
            });
        }
    });
}
