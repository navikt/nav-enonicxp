

var t = require('translation/translation');
var ws = require('/lib/wsUtil');
var handleSockets = require('lib/handleSockets/handleSockets');
var emitter = new ws.SocketEmitter();
exports.get = function (req) {

    handleSockets.handleSockets(emitter);

    if (req.path.indexOf('socket') === -1) {
        return t.get(req);
    }



    return ws.sendSocketResponse(req, '/app/' + app.name + '/socket');
};






exports.webSocketEvent = ws.getWsEvents;