var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var view = resolve('main-article-related-content.html');
var cache = require('/lib/cacheControll');

function handleGet(req) {
    return cache.getPaths('main-article-related-content' + req.path, function () {
        var content = portal.getContent();
        var menuListItems = content.data.menuListItems || [];
        var keys =
            (menuListItems._selected
                    ? (Array.isArray(menuListItems._selected) ? menuListItems._selected : [menuListItems._selected])
                    : []
            );



        var linkList = keys.map( function(el) {
            var links = forceArr(menuListItems[el].link).concat(
                (menuListItems[el].files
                    ?   forceArr(menuListItems[el].files).map(function (fileid) {
                            var file = contentLib.get({key: fileid});
                            return {
                                isFile: true,
                                link: portal.attachmentUrl({ id: file._id, download: true}),
                                displayName: file.displayName,
                                data: {}
                            }
                        })
                    :   []
                )
            );
            return {
                name: el,
                links: links.map(function (link){
                    var element = (typeof link === 'string' ? contentLib.get({key: link}) : link);
                    return {
                        title: element.data.heading || element.displayName,
                        link: (!element.isFile ? portal.pageUrl({id: link}) : element.link)
                    };
                })
            };
        });

        var hasMenuLists = (linkList.length > 0);
        var params = {
            relatedContentList: linkList,
            hasMenuList: hasMenuLists
        };

        var body = thymeleafLib.render(view, params);

        return {
            contentType: 'text/html',
            body: body
        };
    })

}


exports.get = handleGet;
function forceArr(element) {
    return (element !== undefined ? (Array.isArray(element) ? element : [element]) : []);
}
