var portal = require('/lib/xp/portal');
var thymeleaf = require('/lib/thymeleaf');
var cache = require('/lib/cacheControll');
var view = resolve('transport.html');
exports.get = function (req) {
    return cache.getPaths(req.path, 'transport', function () {
        var content = portal.getContent();

        var items = Array.isArray(content.data.items) ? content.data.items : [content.data.items];

        var model = {
            title: content.data.title,
            ingress: content.data.ingress,
            items: items.map(function (value) {
                return {
                    title: value.title,
                    ingress: value.ingress,
                    url: getUrl(value.url),
                    logo: portal.attachmentUrl({
                        id: value.logo,
                    }),
                    className: value.spanning ? 'heldekkende' : '',
                };
            }),
        };

        var body = thymeleaf.render(view, model);
        return {
            body: body,
            pageContributions: {
                headEnd: ['<link rel="stylesheet" href="' + portal.assetUrl({
                    path: 'styles/css/navno.css',
                }) + '"/>'],
            },
        };
    });
};

function getUrl (url) {
    if (url.text) { return url.text; }
    return portal.pageUrl({
        id: url.ref,
    });
}
