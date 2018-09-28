var portal = require('/lib/xp/portal');
var thymeleaf = require('/lib/xp/thymeleaf');
var view = resolve('./main.html');

exports.get = function(req) {

  // Find the current component.
  var component = portal.getComponent();

  // Resolve the view

  // Define the model
  var model = {
    firstRegion: component.regions["first"],
    secondRegion: component.regions["second"],
      lClass: !!(component.regions['second']) ?
          { first: 'col-sm-12 col-md-8', second: 'col-sm-12 col-md-4' } :
          { first: 'col-sm-12', second: '' }

  };

  // Render a thymeleaf template
  var body = thymeleaf.render(view, model);

  // Return the result
  return {
    body: body,
    contentType: 'text/html'
  };

};
