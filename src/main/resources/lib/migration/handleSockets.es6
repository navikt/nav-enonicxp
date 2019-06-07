var deadLinks = require('/lib/migration/deadLinks');
var translate = require('/lib/migration/translate/translate');
var templates = require('/lib/migration/templates');
var move = require('/lib/migration/move');
var pushToMaster = require('/lib/migration/pushToMaster');
var clean = require('/lib/migration/clean');
var priorityElements = require('/lib/migration/priorityElements');
var moveCH = require('/lib/migration/moveContentHome');
var genMegaMenu = require('/lib/migration/megaMenu');
var dataValidation = require('/lib/migration/dataValidation');

exports.handleSockets = function (io) {
    io.connect(function (socket) {
        clean.handle(socket);
        move.handle(socket);
        templates.handle(socket);
        moveCH.handle(socket);
        translate.handle(socket);
        genMegaMenu.handle(socket);
        dataValidation.handle(socket);
        priorityElements.handle(socket);
        deadLinks.handle(socket);
        pushToMaster.handle(socket);
    });
};
