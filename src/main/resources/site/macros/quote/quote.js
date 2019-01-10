// Example usage: [currentUser defaultText="Anonymous"/]
var authLib = require('/lib/xp/auth');
var portalLib = require('/lib/xp/portal');

exports.macro = function (context) {
    var text = context.params.quote;
  
    var body = '<blockquote><p>'+text+'</p></blockquote>';

    return {
        body: body
    }
};

