var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
var view = resolve('../../site/parts/linklist-contentbyletter/linklist-contentbyletter.html');

function handleGet(req) {

    var letter = req.params.letter;
    var list = []
    if (letter) {
        list = content.getChildren({
            key: '7d54791c-aa4b-480c-acfd-80636054b309',
            start: 0,
            count: 10000
        }).hits.reduce(function (t, el) {
            if (el.data.heading.toLowerCase().startsWith(letter)) t.push({ heading: el.data.heading, url: portal.pageUrl({ id: el.data.link}) });
            return t;
        }, []);
    }




    var params = {
        list: list,
        hasList: list.length > 0
    };

    log.info(JSON.stringify(params));
    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;
