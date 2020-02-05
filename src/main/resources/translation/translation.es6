
const mustache = require('/lib/mustache');

exports.get = function (req) {
    const view = resolve('translation.html');
    const appBaseUrl = '/webapp/' + app.name;
    const params = {
        baseUri: appBaseUrl + '/',
        assetsUri: appBaseUrl,
        serviceUrl: appBaseUrl,
    };

    const body = mustache.render(view, params);

    return {
        contentType: 'text/html',
        body: body,
    };
};
