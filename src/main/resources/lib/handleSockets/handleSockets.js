var deadLinks = require('../deadLinks/deadLinks');
var translate = require('../translate/translate');
var templates = require('../templates/templates');
var move = require('../move/move');
var pushToMaster = require('../pushToMaster/pushToMaster');
var clean = require('../clean');
var priorityElements = require('../priorityElements');
var moveCH = require('../moveContentHome');
var genMegaMenu = require('../megaMenu');
var dataValidation = require('../dataValidation');
// var linkCleanup = require('../linkCleanup');
// var unusedContent = require('../unusedContent');

exports.handleSockets = function(io) {
    io.connect(function(socket) {
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
