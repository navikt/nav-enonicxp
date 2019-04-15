
var mustache = require('/lib/mustache');

exports.get = function (req) {
    var view = resolve('translation.html');
    var appBaseUrl = '/webapp/' + app.name;
    var params = {
        baseUri: appBaseUrl + '/',
        assetsUri: appBaseUrl,
        serviceUrl: appBaseUrl
    };

    var body = mustache.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    }
}