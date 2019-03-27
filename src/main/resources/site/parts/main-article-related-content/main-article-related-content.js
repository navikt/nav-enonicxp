var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var view = resolve('main-article-related-content.html');
var cache = require('/lib/cacheControll');
var langLib = require('/lib/i18nUtil');
var contentTranslator = require('../../lib/contentTranslator');

function handleGet(req) {
    return cache.getPaths(req.path, 'main-article-related-content', function() {
        var content = portal.getContent();
        var selectNames = langLib.parseBundle(content.language).related_content.select;
        var menuListItems = content.data.menuListItems || {};
        var keys = menuListItems._selected ? (Array.isArray(menuListItems._selected) ? menuListItems._selected : [menuListItems._selected]) : [];
        var linkList = keys.map(function(el) {
            var links = forceArr(menuListItems[el].link);
            return {
                name: selectNames[el] !== undefined ? selectNames[el] : '',
                links: links
                    .map(function(link) {
                        var element = contentLib.get({ key: link });
                        if (!element) return undefined;
                        var isFile = element.type === 'media:document';
                        //log.info(JSON.stringify(element, null, 4));
                        return {
                            title: element.displayName,
                            link: !isFile ? portal.pageUrl({ id: link }) : portal.attachmentUrl({ id: element._id, download: true })
                        };
                    })
                    .reduce(function(t, el) {
                        if (el) t.push(el);
                        return t;
                    }, [])
            };
        });

        var hasMenuLists = linkList.length > 0;
        var params = {
            relatedContentList: linkList,
            hasMenuList: hasMenuLists
        };

        var body = thymeleafLib.render(view, params);

        return {
            contentType: 'text/html',
            body: body
        };
    });
}

exports.get = handleGet;
function forceArr(element) {
    return element !== undefined ? (Array.isArray(element) ? element : [element]) : [];
}
