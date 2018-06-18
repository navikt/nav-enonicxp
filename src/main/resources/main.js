

var t = require('translation/translation');
var ws = require('/lib/wsUtil');
var handleSockets = require('lib/handleSockets/handleSockets');
var emitter = new ws.SocketEmitter();
exports.get = function (req) {



    if (req.path.indexOf('socket') === -1) {
        return t.get(req);
    }




    log.info(JSON.stringify(req));

    return ws.sendSocketResponse(req, '/app/' + app.name + '/socket');
};
emitter.connect(function(socket) {
   socket.emit('hello', 'Hello client');
});

var io = new ws.SocketEmitter();

handleSockets.handleSockets(io);

exports.webSocketEvent = ws.getWsEvents;