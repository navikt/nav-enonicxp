const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    http: require('/lib/http-client'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('./searchresult.html');

const sortTimePeriod = (intervals) => {
    const order = ['Siste 7 dager', 'Siste 30 dager', 'Siste 12 måneder', 'Eldre enn 12 måneder'];

    const orderedIntervals = intervals.buckets.map((interval, ix) => ({
        ...interval,
        index: parseInt(ix),
    }));
    return orderedIntervals.sort((a, b) => {
        if (order.indexOf(a.key) > order.indexOf(b.key)) {
            return 1;
        }
        if (order.indexOf(b.key) > order.indexOf(a.key)) {
            return -1;
        }
        return 0;
    });
};

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
    let model = {};
    try {
        model = JSON.parse(response.body);
        model.aggregations.Tidsperiode.buckets = sortTimePeriod(model.aggregations.Tidsperiode);
    } catch (e) {
        log.info(e);
        log.info(response.body);
    }
    const content = libs.portal.getContent();
    const langBundle = libs.lang.parseBundle(content.language).search;
    model.labelResults = (langBundle && langBundle.labelResults) || '';
    model.labelFacets = (langBundle && langBundle.labelFacets) || '';
    model.searchApi = url;
    model.form = libs.portal.pageUrl({
        id: libs.portal.getContent()._id,
    });

    return {
        body: libs.thymeleaf.render(view, model),
    };
}

exports.get = get;
