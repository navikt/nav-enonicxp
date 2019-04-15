var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('navigator-win.html');

function handleGet(req) {

    var params = {
        partName: "navigator-win"
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

<datasources/>

*/
