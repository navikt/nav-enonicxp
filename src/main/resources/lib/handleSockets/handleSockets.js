
var deadLinks = require('../deadLinks/deadLinks');
var translate = require('../translate/translate');

exports.handleSockets = function (io) {
    io.connect(function (socket) {
        deadLinks.handle(socket);
        translate.handle(socket);
    })
}

