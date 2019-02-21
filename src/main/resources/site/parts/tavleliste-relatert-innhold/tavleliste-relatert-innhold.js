var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var cache = require('/lib/cacheControll');
var view = resolve('tavleliste-relatert-innhold.html');
var language = require('/lib/i18nUtil');
var contentLib = require('/lib/xp/content');

function handleGet(req) {
   // return cache.getPaths('tavleliste-relatert-innhold' + req.path, function () {
        var content = portal.getContent();
        var shortcuts = language.parseBundle(content.language).oppslagstavle.shortcuts;
        var selected = content.data.menuListItems ? content.data.menuListItems._selected : undefined;

        var data = selected ?
            Array.isArray(content.data.menuListItems[selected].link)
                ? content.data.menuListItems[selected].link
                : [ content.data.menuListItems[selected].link ]
        : [];
        var arefs = data.map(function (value) {
            var el = contentLib.get({ key: value});
             return  {
                title: el.displayName,
                link: getSrc(el)
            }
        });
        log.info(JSON.stringify(arefs, null, 4))
        var params = {
            shortcuts: shortcuts,
            content: arefs,
            hasLinks: arefs.length > 0
        };

        var body = thymeleafLib.render(view, params);

        return {
            contentType: 'text/html',
            body: body
        };
   // })

}

exports.get = handleGet;

function getSrc(element) {
    return element.type.indexOf('api') === -1 ? portal.pageUrl({ id: element._id }) : element.href
}
