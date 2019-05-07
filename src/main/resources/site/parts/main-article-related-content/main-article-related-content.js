var thymeleafLib = require('/lib/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var view = resolve('main-article-related-content.html');
var cache = require('/lib/cacheControll');
var langLib = require('/lib/i18nUtil');

function handleGet(req) {
    return cache.getPaths(req.path, 'main-article-related-content', function() {
        var content = portal.getContent();
        var selectNames = langLib.parseBundle(content.language).related_content.select;
        var menuListItems = content.data.menuListItems || {};
        var keys = ["selfservice", "form-and-application",  "process-times", "related-information", "international", "report-changes", "rates",  "appeal-rights", "membership", "rules-and-regulations"];
        var linkList = keys.map(function(el) {
            if(!menuListItems[el]) return undefined;
            var links = forceArr(menuListItems[el].link);
            return {
                name: selectNames[el] !== undefined ? selectNames[el] : '',
                links: links
                    .map(function(contentId) {
                        var element = contentLib.get({ key: contentId });
                        if (!element) return undefined;
                        var link = "";
                        if(element.type === 'media:document') {
                            link = portal.attachmentUrl({ id: element._id, download: true });
                        } else if(element.type === 'no.nav.navno:Ekstern_lenke'){
                            var url = element.data.url;
                            if(url.indexOf('http') !== 0) {
                                url = 'https://' + url;
                            }
                            link = url;
                        } else {
                            link = portal.pageUrl({ id: contentId });
                        }
                        return {
                            title: element.displayName,
                            link: link
                        };
                    }).reduce(function(t, el) {
                        if (el) t.push(el);
                        return t;
                    }, [])
            };

        })
        .reduce(function(t, el) {
            if (el && el.links && el.links.length > 0) t.push(el);
            return t;
        }, []);

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