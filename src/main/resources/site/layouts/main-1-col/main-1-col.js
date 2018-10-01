var portal = require('/lib/xp/portal');
var thymeleaf = require('/lib/xp/thymeleaf');
var view = resolve('./main-1-col.html');

exports.get = function(req) {

  // Find the current component.
  var component = portal.getComponent();

  // Define the model
  var model = {
    firstRegion: component.regions["first"]
  };

  // Render a thymeleaf template
  var body = thymeleaf.render(view, model);

  // Return the result
  return {
    body: body,
    contentType: 'text/html'
  };

};
