var event = require('/lib/xp/event');
var redirects = {};
var trans = require('/lib/contentTranslator');
var main = require('../../main');

exports.handle404 = function (req) {
    if (req.request.path in main.redirects) {
        return {
            redirect: main.redirects[req.request.path]
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