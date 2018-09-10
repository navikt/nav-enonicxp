var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var view = resolve('main-article-related-content.html');

function handleGet(req) {

    var content = portal.getContent();
    var menuListItems = content.data.menuListItems || [];
    var keys =
        (menuListItems._selected
            ? (Array.isArray(menuListItems._selected) ? menuListItems._selected : [menuListItems._selected])
            : []
        );
    var links = keys.map( function(el) {
        return ({ name: el, links: forceArr(menuListItems[el].link).map(function (link){
                var element = contentLib.get({key: link});
                return(
                    { title: element.data.heading || element.displayName, link: portal.pageUrl({id: link}) }
                );
            })
        });
    });

    var hasMenuLists = (links.length > 0);
    var params = {
        relatedContentList: links,
        hasMenuList: hasMenuLists
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}


exports.get = handleGet;
function forceArr(element) {
    return Array.isArray(element) ? element : [element]
}
