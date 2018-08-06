var portal = require('/lib/xp/portal');
var thymeleaf = require('/lib/xp/thymeleaf');
var parsers = require('../../lib/tableFunctions/tableFunctions');
var view = resolve('ekstraStorTabell.html');
exports.get = function (req) {


    var content = portal.getContent();


    var model = content;

  var m =   parsers.parse(content.data.article.text);

    var i = parsers.map(m);
    log.info(i);

    var body = thymeleaf.render(view, model);
    return {
        body: i
    }
}