
var deadLinks = require('../deadLinks/deadLinks');
var translate = require('../translate/translate');
var templates = require('../templates/templates');
var move = require('../move/move');
var cms = require('../changeMainArticle');
var pushToMaster = require('../pushToMaster/pushToMaster');
var flyttKortUrl = require('../flyttKortUrl/flyttKortUrl');
var clean = require('../clean');
var priorityElements = require('../priorityElements');
var tweakTavleliste = require('../tweakTavleliste');
var moveCH = require('../moveContentHome');
var rapportHandbok = require('../rapportHandbok');
var genMegaMenu = require('../megaMenu');
var oppslagstavle = require('../oppslagstavle'); // used for debug only
var linkCleanup = require('../linkCleanup');

exports.handleSockets = function (io) {
    io.connect(function (socket) {
        clean.handle(socket);
        priorityElements.handle(socket);
        cms.handle(socket);
        move.handle(socket);
        flyttKortUrl.handle(socket);
        templates.handle(socket);
        deadLinks.handle(socket);
        translate.handle(socket);
        tweakTavleliste.handle(socket);
        moveCH.handle(socket);
        genMegaMenu.handle(socket);
        pushToMaster.handle(socket);
        rapportHandbok.handle(socket);
        oppslagstavle.handle(socket);
        // linkCleanup.handle(socket);
    })
}