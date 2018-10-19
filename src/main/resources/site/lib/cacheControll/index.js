var cache = require('/lib/cache');
var event = require('/lib/xp/event');
var standardCache = {
    size: 1000,
    expire: 3600 * 24 // One day
}
var caches = {
    decorator: cache.newCache(standardCache),
    paths: cache.newCache(standardCache)
}
module.exports = {
    wipeDecorator: wipe('decorator'),
    wipePaths: wipe('paths'),
    getDecorator: getSome('decorator'),
    getPaths: getSome('paths'),
    activateEventListener: activateEventListener,
    whipeAll: wipeAll
};

function wipeAll() {
    wipe('decorator')();
    wipe('paths')();
}

function wipe(name) {
    return function(key) {
        if (!key) {
            caches[name].clear();
        }
        else caches[name].remove(key);
    }
}



function getSome(name) {
    return function (key, f, params) {
        return caches[name].get(key, function () {
            log.info('Cache ' + name + ': ' + caches[name].getSize());
            return f(params);
        })
    }
}

function activateEventListener() {
    event.listener({
        type: 'node.update',
        localOnly: false,
        callback: function (event) {
            log.info(JSON.stringify(event,null,4))
        }
    })
}