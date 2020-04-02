const deadLinks = require('/lib/migration/deadLinks');

exports.handleSockets = function(io) {
    io.connect(function(socket) {
        deadLinks.handle(socket);
    });
};
