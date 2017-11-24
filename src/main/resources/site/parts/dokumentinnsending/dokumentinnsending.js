var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('dokumentinnsending.html');

function handleGet(req) {

    var params = {
        partName: "dokumentinnsending"
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
