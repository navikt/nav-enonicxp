var thymeleaf = require('/lib/thymeleaf');
var view = resolve('./searchresult.html');
var http = require('/lib/http-client');
var portal = require('/lib/xp/portal');

function get (req) {
    var url = portal.serviceUrl({
        service: 'search', application: 'navno.nav.no.search', type: 'absolute',
    });
    log.info(url);
    if (url.indexOf('localhost') === -1 && url.indexOf('https://') === -1) {
        url = url.replace('http', 'https');
    }
    log.info(url);
    var response = http.request({
        url: url,
        params: req.params,
        method: 'GET',
    });

    var model;
    try {
        model = JSON.parse(response.body);
    } catch (e) {
        log.info(e);
        log.info(response.body);
    }

    model.form = portal.pageUrl({
        id: portal.getContent()._id,
    });

    var body = thymeleaf.render(view, model);
    return {
        body: body,
    };
}

exports.get = get;
