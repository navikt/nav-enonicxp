
var mustache = require('/lib/xp/mustache');

exports.get = function (req) {
    var view = resolve('translation.html');
    var appBaseUrl = '/app/' + app.name;
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