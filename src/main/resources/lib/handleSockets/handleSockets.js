
var deadLinks = require('../deadLinks/deadLinks');
var translate = require('../translate/translate');
var templates = require('../templates/templates');
var move = require('../move/move');
var cms = require('../changeMainArticle');
var pushToMaster = require('../pushToMaster/pushToMaster');
var flyttKortUrl = require('../flyttKortUrl/flyttKortUrl');

exports.handleSockets = function (io) {
    io.connect(function (socket) {
        cms.handle(socket);
        move.handle(socket);
        flyttKortUrl.handle(socket);
        templates.handle(socket);
        deadLinks.handle(socket);
        translate.handle(socket);
        pushToMaster.handle(socket);
    })
}

