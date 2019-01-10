// Example usage: [currentUser defaultText="Anonymous"/]
var authLib = require('/lib/xp/auth');
var portalLib = require('/lib/xp/portal');

exports.macro = function (context) {
    var text = context.params.text;
    var href = (context.params.url) ? context.params.url : portalLib.pageUrl({
        id: context.params.content
    });

    var body = '<p><a class="btn btn-link btn-small" href="'+href+'">'+text+'</a></p>';

    return {
        body: body
    }
};

