var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
// Resolve the view
var view = resolve('nyheter-nav.html');

exports.get = function(req) {

    var cnt = portal.getContent();

    // Define the model
    var model = cnt.data;

    // Render a thymeleaf template
    var body = thymeleaf.render(view, model);

    // Return the result
    return {
        body: body
    };
};
