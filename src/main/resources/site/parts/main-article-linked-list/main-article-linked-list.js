var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
// Resolve the view
var view = resolve('main-article-linked-list.html');
var cache = require('/lib/cacheControll');

exports.get = function(req) {
    return cache.getPaths('main-article-linked-list' + req.path, function () {
        var cont = portal.getContent();
        var list = createList(cont);

    function createList(cont) {
        var root = {};
        if (cont.hasChildren) {
            root = cont;
        }
        else {
            root = content.get({
                key: cont._path.split('/').slice(0,-1).join('/')
            });
            if (root.type !== app.name + ':main-article') return []
        }
        return [{heading: root.displayName, link: portal.pageUrl({id: root._id}), active: (root === cont)}].concat(content.getChildren({
            key: root._id
        }).hits.reduce(function (previousValue, child) {
            if (!child.type.startsWith("media")) {
              previousValue.push(child)
          }
            return previousValue
        },[]).map(function (el) {
            return { heading: el.data.heading || el.displayName, link: portal.pageUrl({id: el._id}), active: (el._id === cont._id) }
        }))
    }
    // Define the model
    var model = {
        hasList: (list.length > 1),
        list: list
    };

        // Render a thymeleaf template
        var body = thymeleaf.render(view, model);

        // Return the result
        return {
            body: body
        };
    })

};

