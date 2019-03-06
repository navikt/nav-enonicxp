var content = require('/lib/xp/content');
var thymeleafLib = require('/lib/xp/thymeleaf');
var utils = require('/lib/nav-utils');

var view = resolve('printArticle.html');

function sendError(msg) {
    return {
        status: 400,
        body: { message: msg },
        contentType: 'application/json'
    };
}

function handlePrintArticle(req) {
    var body;

    if (!req.params.article) {
        return sendError('Missing param "article".');
    }

    var article = content.get({
        key: req.params.article
    });

    if (!article) {
        return sendError('No article with id: ' + req.params.article);
    }

    var childArticles = [];
    if (article.hasChildren) {
        childArticles = content.getChildren({
            key: article._id,
            start: 0,
            count: 100
        }).hits;
    }

    var renderData = {
        displayName: article.displayName,
        ingress: article.data.ingress,
        text: article.data.text,
        published: article.publish.from,
        publishedText: utils.dateTimePublished(article, article.language || 'no'),
        childArticles: childArticles
    };

    var body = thymeleafLib.render(view, renderData);
    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handlePrintArticle;
