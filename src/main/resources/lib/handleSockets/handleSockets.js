
var deadLinks = require('../deadLinks/deadLinks');
var translate = require('../translate/translate');
var templates = require('../templates/templates');
var move = require('../move/move');
var pushToMaster = require('../pushToMaster/pushToMaster');

exports.handleSockets = function (io) {
    io.connect(function (socket) {
        move.handle(socket);
        templates.handle(socket);
        deadLinks.handle(socket);
        translate.handle(socket);
        pushToMaster.handle(socket);
    })
}

