const t = require('../translation/translation');
const handleSockets = require('/lib/migration/handleSockets');
const ws = require('/lib/wsUtil');

const emitter = new ws.SocketEmitter();

exports.get = function(req) {
    handleSockets.handleSockets(emitter);

    if (req.path.indexOf('socket') === -1) {
        return t.get(req);
    }
    return ws.sendSocketResponse(req, '/webapp/' + app.name + '/socket');
};

exports.webSocketEvent = ws.getWsEvents;
