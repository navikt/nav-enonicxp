const content = require('/lib/xp/content');
const thymeleafLib = require('/lib/thymeleaf');
const utils = require('/lib/nav-utils');

const view = resolve('printArticle.html');

function sendError(msg) {
    return {
        status: 400,
        body: {
            message: msg,
        },
        contentType: 'application/json',
    };
}

function handlePrintArticle(req) {
    if (!req.params.article) {
        return sendError('Missing param "article".');
    }

    const article = content.get({
        key: req.params.article,
    });

    if (!article) {
        return sendError('No article with id: ' + req.params.article);
    }

    let childArticles = [];
    if (article.hasChildren) {
        childArticles = content.getChildren({
            key: article._id,
            start: 0,
            count: 100,
        }).hits;
    }

    const renderData = {
        displayName: article.displayName,
        ingress: article.data.ingress,
        text: article.data.text,
        published: article.publish.from,
        publishedText: utils.dateTimePublished(article, article.language || 'no'),
        childArticles: childArticles,
    };

    const body = thymeleafLib.render(view, renderData);
    return {
        contentType: 'text/html',
        body: body,
    };
}

exports.get = handlePrintArticle;
