var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('receipt.html');

function handleGet(req) {

    var params = {
        partName: "receipt"
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
