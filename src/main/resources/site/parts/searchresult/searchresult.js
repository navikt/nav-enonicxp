var thymeleaf = require('/lib/xp/thymeleaf');
var view = resolve('./searchresult.html');
var http = require('/lib/http-client');
var portal = require('/lib/xp/portal');

function get(req) {
    var response = http.request({
        url: portal.serviceUrl({ service: 'search', application: 'navno.nav.no.search', type: 'absolute' }),
        params: req.params,
        method: 'GET'
    });

    var model = JSON.parse(response.body);

    model.form = portal.pageUrl({
        id: portal.getContent()._id
    });

    var body = thymeleaf.render(view, model);
    return {
        body: body
    };
}

exports.get = get;
