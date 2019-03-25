var thymeleafLib = require('/lib/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var view = resolve('main-article-related-content.html');
var cache = require('/lib/cacheControll');
var langLib = require('/lib/i18nUtil');
var contentTranslator = require('/lib/contentTranslator');

function handleGet(req) {
    return cache.getPaths('main-article-related-content' + req.path, function() {
        var content = portal.getContent();
        var selectNames = langLib.parseBundle(content.language).related_content.select;
        var menuListItems = content.data.menuListItems || {};
        var keys = menuListItems._selected ? (Array.isArray(menuListItems._selected) ? menuListItems._selected : [menuListItems._selected]) : [];
        var linkList = keys.map(function(el) {
            var links = forceArr(menuListItems[el].link);
            var files = forceArr(menuListItems[el].files);
            return {
                name: selectNames[el] !== undefined ? selectNames[el] : '',
                files: files
                    .map(function(file) {
                        var file = contentLib.get({
                            key: file
                        });
                        if (!file) return undefined;
                        return {
                            title: file.displayName,
                            link: portal.attachmentUrl({ id: file._id, download: true })
                        };
                    })
                    .reduce(function(t, el) {
                        if (el) t.push(el);
                        return t;
                    }, []),
                links: links
                    .map(function(link) {
                        var element = contentLib.get({ key: link });
                        if (!element) return undefined;
                        var isFile = element.type === 'media:document';
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
