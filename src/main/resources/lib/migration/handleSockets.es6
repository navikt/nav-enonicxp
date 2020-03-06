const deadLinks = require('/lib/migration/deadLinks');
// var templates = require('/lib/migration/templates');

exports.handleSockets = function (io) {
    io.connect(function (socket) {
        // templates.handle(socket);
        deadLinks.handle(socket);
    });
};
