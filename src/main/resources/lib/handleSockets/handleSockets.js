
var deadLinks = require('deadLinks');

exports.handleSockets = function (io) {
    io.connect(function (socket) {
        socket.on('deadLinks', function (message) {
            handleDeadLinks(socket, message);
        });
        socket.on('all', function(message) {
            handleEverything(socket, message);
        });
        socket.on('translate', function (message) {
            handleTranslation(socket, message);
        })
    })
}

function handleDeadLinks(socket, message) {
    deadLinks.handle(socket);
}