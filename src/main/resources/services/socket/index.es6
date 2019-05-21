var ws = require('/lib/wsUtil');

exports.handleSocket = function (e) {
    ws.openWebsockets(this, '/app/' + app.name + '/_/socket/index.js');
    ws.setEventHandler('open', function (message) {
        log.info(JSON.stringify(message));
    });
    var emitter = new ws.SocketEmitter();

    emitter.connect(function (socket) {
        log.info(JSON.stringify(socket));
        socket.emit('hello', 'hello');
    });
};
