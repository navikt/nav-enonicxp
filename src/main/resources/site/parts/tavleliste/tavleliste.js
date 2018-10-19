var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
var trans = require('/lib/contentTranslator');
var utils = require('/lib/nav-utils');
var cache = require('/lib/cacheControll');
// Resolve the view
var view = resolve('tavleliste.html');

exports.get = function(req) {
    return cache.getPaths('tavleliste' + req.path, function () {
        var cont = portal.getContent();
        var ids = cont.data.sectionContents;
        ids = (!Array.isArray(ids)) ? [ids] : ids;
        var items = content.getChildren({key: cont._id}).hits.map(function (el) {
            return { src: portal.pageUrl({id: el._id}), heading: el.data.heading, ingress: el.data.ingress }
        });

        // Define the model
        var model = {
            published: utils.dateTimePublished(cont, cont.language || 'no'),
            from: cont.published.from,
            heading: cont.data.heading || cont.displayName,
            ingress: cont.data.ingress,
            items: items
        };

        // Render a thymeleaf template
        var body = thymeleaf.render(view, model);

        // Return the result
        return {
            body: body
        };
    })

};
