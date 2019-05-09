var t = require('../translation/translation');
var handleSockets = require('/lib/migration/handleSockets/handleSockets');
var ws = require('/lib/wsUtil');
var emitter = new ws.SocketEmitter();

exports.get = function (req) {
    handleSockets.handleSockets(emitter);

    if (req.path.indexOf('socket') === -1) {
        return t.get(req);
    }
    return ws.sendSocketResponse(req, '/webapp/' + app.name + '/socket');
};

exports.webSocketEvent = ws.getWsEvents;