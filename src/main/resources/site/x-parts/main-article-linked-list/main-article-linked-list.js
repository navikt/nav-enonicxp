var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
// Resolve the view
var view = resolve('main-article-linked-list.html');

exports.get = function(req) {

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
        return [{heading: root.data.heading, link: portal.pageUrl({id: root._id}), active: (root === cont)}].concat(content.getChildren({
            key: root._id
        }).hits.map(function (el) {
            return { heading: el.data.heading || el.displayName, link: portal.pageUrl({id: el._id}), active: (el._id === cont._id) }
        }))
    }
    // Define the model
    var model = {
        hasList: (list.length > 0),
        list: list
    };

    // Render a thymeleaf template
    var body = thymeleaf.render(view, model);

    // Return the result
    return {
        body: body
    };
};

