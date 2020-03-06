const ws = require('/lib/wsUtil');

exports.handleSocket = function(e) {
    ws.openWebsockets(this, '/app/' + app.name + '/_/socket/index.js');
    ws.setEventHandler('open', message => {
        log.info(JSON.stringify(message));
    });
    const emitter = new ws.SocketEmitter();

    emitter.connect(socket => {
        log.info(JSON.stringify(socket));
        socket.emit('hello', 'hello');
    });
};
