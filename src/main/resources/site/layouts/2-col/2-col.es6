var portal = require('/lib/xp/portal');
var thymeleaf = require('/lib/thymeleaf');

exports.get = function (req) {
    // Find the current component.
    var component = portal.getComponent();

    // Resolve the view
    var view = resolve('./2-col.html');

    // Define the model
    var model = {
        firstRegion: component.regions['first'],
        secondRegion: component.regions['second'],
    };

    // Render a thymeleaf template
    var body = thymeleaf.render(view, model);

    // Return the result
    return {
        body: body,
        contentType: 'text/html',
    };
};
