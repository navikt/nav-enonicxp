var event = require('/lib/xp/event');
var redirects = {};
var trans = require('/lib/contentTranslator');
var main = require('../../main');

exports.handle404 = function (req) {
    log.info('Hello');
        trans.logBeautify(req);
    if (req.request.path in main.redirects) {
        return {
            redirect: main.redirects[req.request.path]
        }
    }
    else if (req.request.path.split("+").length > 2) {
        return {
            body: JSON.stringify(req.request)
        }
    }
    else {
        trans.logBeautify(req);
        trans.logBeautify(main.redirects);
        return {
            body: 'Missing',
            contentType: 'text/plain'
        }
    }
}

exports.handleError = function (req) {
    trans.logBeautify(req);
    return {
        body: JSON.stringify(req)
    }
}