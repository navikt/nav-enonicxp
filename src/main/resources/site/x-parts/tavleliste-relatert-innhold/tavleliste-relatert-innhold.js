var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var trans = require('/lib/contentTranslator');
var view = resolve('tavleliste-relatert-innhold.html');

function handleGet(req) {

    var content = trans.translate(portal.getContent());
    if (content.data.menuListItems && !Array.isArray(content.data.menuListItems)) content.data.menuListItems = [content.data.menuListItems];
    content.data.menuListItems = (content.data.menuListItems) ? content.data.menuListItems.map(function (item) {
        if (!item.link) item.link = [];
        if (typeof item.link === 'string') item.link = [item.link];
        return {menuListName: item.menuListName, link: item.link.map(function(l) {

                log.info(l);
                var r;
                try{
                    r= contentLib.get({ key: l});
                } catch (e) {
                    log.info("Failed in marc " + l);
                }

                return (r) ? { title: r.data.heading, link: portal.pageUrl({ id: r._id})} : undefined
            }).reduce(function(t,e) {
                if (e) t.push(e);
                return t;
            },[] )}
    }).reduce(function (t, el) {
        if (el.link && el.link.length > 0) t.push(el);
        return t
    }, []) : [];


    var hasLinks = (content.data.menuListItems.length > 0);


    var params = {
        content: content,
        hasLinks: hasLinks
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;
