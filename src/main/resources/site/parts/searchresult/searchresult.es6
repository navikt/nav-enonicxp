const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    http: require('/lib/http-client'),
    portal: require('/lib/xp/portal'),
};
const view = resolve('./searchresult.html');

function get(req) {
    let url = libs.portal.serviceUrl({
        service: 'search',
        application: 'navno.nav.no.search',
        type: 'absolute',
    });

    if (url.indexOf('localhost') === -1 && url.indexOf('https://') === -1) {
        url = url.replace('http', 'https');
    }

    if (req.params.ord && req.params.ord.length > 200) {
        req.params.ord = req.params.ord.substring(0, 200);
    }

    if (req.params.ord) {
        req.params.ord = encodeURI(req.params.ord);
    }

    if (Array.isArray(req.params.uf)) {
        req.params.uf = JSON.stringify(req.params.uf);
    }

    const response = libs.http.request({
        url,
        params: req.params,
        method: 'GET',
    });

    let model;

    try {
        model = JSON.parse(response.body);
    } catch (e) {
        log.info(e);
        log.info(response.body);
    }

    model.searchApi = url;
    model.form = libs.portal.pageUrl({
        id: libs.portal.getContent()._id,
    });

    return {
        body: libs.thymeleaf.render(view, model),
    };
}

exports.get = get;
