var mustacheLib = require('/lib/mustache');
var authLib = require('/lib/xp/auth');

var view = resolve('page.html');

exports.get = function () {
    if (!authLib.hasRole('system.admin')) {
        return {
            status: 401
        }
    }

    var appBaseUrl = '/app/' + app.name;
    var params = {
        baseUri: appBaseUrl + '/',
        assetsUri: appBaseUrl,
        serviceUrl: appBaseUrl
    };

    var body = mustacheLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    }
};
