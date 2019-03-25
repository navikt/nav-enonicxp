

// var t = require('../translation/translation');

var ws = require('/lib/wsUtil');
// var handleSockets = require('lib/handleSockets/handleSockets');
// var emitter = new ws.SocketEmitter();
// var langVersions = require('lib/langVersions/langVersions');
// var trans = require('/lib/contentTranslator');
var cache = require('/lib/cacheControll');
var event = require('/lib/xp/event');
var nodeLib = require('/lib/xp/node');
// var repo = nodeLib.connect({
//     repoId: 'cms-repo',
//     branch: 'draft',
//     principals: ['role:system.admin']
// });

//langVersions.handleLanguageVersion(trans);

cache.activateEventListener();

event.listener({
    type: 'node.updated',
    callback: handleUpdate
});
event.listener({
    type: 'node.*',
    localOnly: false,
    callback: function (event) {
        log.info(JSON.stringify(event));
    }
});

function handleUpdate(event) {
    // var node = repo.get(event.data.nodes.pop().id);
    // // log.info(JSON.stringify(node, null, 4));
    // if (!node.publish || node.publish.to !== node.data.date) {
    //     repo.modify({
    //         key: node._id,
    //         editor: function (n) {
    //             if (!n.publish) n.publish = {};
    //             n.publish.from = n.modifiedTime || n.createdTime
    //             n.publish.to = n.data.date;
    //             return n;
    //         }
    //     })
    // }
}
