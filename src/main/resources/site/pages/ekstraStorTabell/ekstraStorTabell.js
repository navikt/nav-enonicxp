var portal = require('/lib/xp/portal');
var thymeleaf = require('/lib/xp/thymeleaf');
var parsers = require('../../lib/tableFunctions/tableFunctions');
var trans = require('../../lib/contentTranslator');
var view = resolve('ekstraStorTabell.html');
exports.get = function(req) {
    // NOTE It works to get styles and images from xx-www.nav.no, but this should probably be moved at some point
    var stylePath = 'xx-www.nav.no/styles/';
    var content = portal.getContent();

    var parsed;
    if (content.data.article && content.data.article.text) {
        var m = parsers.parse(content.data.article.text);
        parsed = parsers.map(m, true);
    }

    var referer = req.headers.Referer;
    var model = {
        title: content.displayName,
        content: parsed,
        referer: referer,
        styles: {
            main: portal.assetUrl({ path: stylePath + 'main.css' }),
            content: portal.assetUrl({ path: stylePath + 'content.css' }),
            ie: portal.assetUrl({ path: stylePath + 'ie.css' }),
            print: portal.assetUrl({ path: stylePath + 'print.css' })
        },
        icons: {
            nav: portal.assetUrl({ path: 'xx-www.nav.no/bilder/global/navlogohvit.gif' }),
            close: portal.assetUrl({ path: 'xx-www.nav.no/bilder/global/ikonlukk.gif' }),
            favicon: portal.assetUrl({ path: 'img/favicon.ico' })
        }
    };

    var body = thymeleaf.render(view, model);
    return {
        body: body
    };
};
