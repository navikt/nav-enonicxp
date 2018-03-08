
var contentLib = require('/lib/xp/content');

exports.get = handleGet;

function handleGet(req) {
    var params = req.params;
    var query = {

    }
    log.info(JSON.stringify(params));

    return {
        contentType: 'application/json',
        body: body
    }
}