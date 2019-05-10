var thymeleafLib = require('/lib/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
var view = resolve('contentAZ.html');

function handleGet(req) {
    var letter = req.params.letter;
    var list = [];
    if (letter) {
        var langauge = req.path.indexOf('/en/') !== -1 ? 'en' : 'no';
        var footerAZList = '/www.nav.no/no/innhold-a-aa';
        if (langauge === 'en') {
            footerAZList = '/www.nav.no/en/content-a-z';
        }
        list = content
            .getChildren({
                key: footerAZList,
                start: 0,
                count: 10000
            })
            .hits.filter(function(el) {
                if ((el.type === 'base:shortcut' || el.type === app.name + ':url') && el.displayName.toLowerCase().startsWith(letter)) {
                    return true;
                }
                return false;
            })
            .map(function(el) {
                var url;
                if (el.type === 'base:shortcut') {
                    url = portal.pageUrl({ id: el.data.target });
                } else if (el.type === app.name + ':url') {
                    url = el.data.url;
                }
                return {
                    heading: el.displayName,
                    url: url
                };
            });
    }

    var params = {
        list: list,
        hasList: list.length > 0
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;
