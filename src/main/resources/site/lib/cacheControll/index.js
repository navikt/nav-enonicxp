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
    branch: 'draft',
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

function getPath(path) {
    if (!path) return;
    var arr = path.split('/www.nav.no/');
    /* Siden path kan være så forskjellige for samme innhold så kapper vi path array til det som er relevant */
    /* Funksjonen er idempotent slik at getPath(path) === getPath(getPath(path)) */
    return arr[arr.length - 1];
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
        log.info('Cache remove key ' + getPath(key));
        if (!key) {
            caches[name].clear();
        } else caches[name].remove(getPath(key));
    };
}

function wipeOnChange(value) {
    var wipee = repo.get(value.id);
    var w = wipe('paths');
    log.info('WIPE: ' + 'main-article-related-content/' + getPath(wipee._path) + ' :: ' + wipee._path);
    w('megamenu-item/' + getPath(wipee._path));
    w('main-article/' + getPath(wipee._path));
    w('main-article-linked-list/' + getPath(wipee._path));
    w('main-article-related-content/' + getPath(wipee._path));
    w('oppslagstavle/' + getPath(wipee._path));
    w('tavleliste/' + getPath(wipee._path));
    w('tavleliste-relatert-innhold/' + getPath(wipee._path));
    w('transport/' + getPath(wipee._path));
}

function getSome(name) {
    return function(key, f, params) {
        /* Vil ikke cache innhold som redigeres */
        // TODO test for www-x adresser
        if (key.indexOf('/admin/portal/edit') === -1 && key.indexOf('/preview/draft') === -1) {
            return caches[name].get(getPath(key), function() {
                log.info('Store cache key: ' + getPath(key) + ' :: ' + key);
                // log.info('Cache ' + name + ': ' + caches[name].getSize());
                return f(params);
            });
        } else {
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
