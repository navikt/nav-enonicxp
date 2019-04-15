var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('menualphabetical.html');

function handleGet(req) {

    var params = {
        partName: "menualphabetical"
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
