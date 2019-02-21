

var content = require('/lib/xp/content');
var portal = require('/lib/xp/portal');

exports.handle404 = function (req) {

    log.info(JSON.stringify(req, null, 4))

    var path = req.request.path.split('/').pop();

    log.info(path);
    if (path === 'www.nav.no') return {
        redirect: 'www.nav.no/forsiden'
    };

    var element = content.getChildren({
        key: '/redirects',
        start: 0,
        count: 10000
    }).hits.reduce(function (t, el) {
        if (el.displayName === path) t = (el.type === app.name + ':url') ? el : content.get({key: el.data.target}) ;
        return t;
    }, false);
    if (element) {
        var redirect = portal.pageUrl({id: element._id});
        if (element.type === app.name + ':url') {
             redirect = portal.pageUrl(validateUrl(element.data.url.toLowerCase()).andOr(stripProtocol).andOr(appendRoot).andOr(xpInfuse).endValidation);
        }
        log.info('Final ' + redirect);
        return {
            redirect: redirect
        }
    }
    return {
        body: 'Missing',
        contentType: 'text/plain'
    }

}

function stripProtocol(url) {
    return url.replace(/http[s]?:\/\/www\.nav\.no/, '')
}


function validateUrl(url) {
    log.info(url);
    var valid = url.startsWith('http') && url.indexOf('www.nav.no') === -1;

    function andOr(f) {
        if (!valid) {
            url = f(url)
        }
        return {
            andOr: andOr,
            endValidation: splitParams(url)
        }
    }
    return {
        andOr: andOr,
        endValidation: splitParams(url)
    }

    function splitParams(url) {
        return {
            path: url.split('?')[0],
            params: url.split('?')[1] ? url.split('?')[1].split('&').reduce(function(t, el) {
                t[el.split('=')[0]] = el.split('=')[1]
            },{}) : {}
        }
    }
}

function appendRoot(url) {
    if (!url.startsWith('/')) url = '/' + url;
    return '/www.nav.no' + url;
}
function xpInfuse(url) {
    url = url.replace(/\+/g, '-').replace(/%c3%b8/g, 'o').replace(/%c3%a5/g, 'a').replace(/%20/g, '-').replace(/%c3%a6/g, 'ae').replace(/(\.cms|\.\d+)/g, '');
    return url
}
