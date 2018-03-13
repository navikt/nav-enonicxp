var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
var contentTranslator = require('../../lib/contentTranslator');
// Resolve the view
var view = resolve('main-article.html');

exports.get = function(req) {
    //contentTranslator.logBeautify(req);
    var toc = null;
    // Define the model
    var content =portal.getContent();

    //var locale = getLocale(req);

    function getLocale(request) {
        var def = 'nb-NO';
        return request.headers['Accept-Language'].split(",");
    }

    var data = tryLocales(getLocale(req), content);
    if (data) {
        content.data.heading = data.s_heading;
        content.data.ingress = data.s_ingress;
        content.data.text = data.s_text;
    }
   // contentTranslator.logBeautify(tryLocales(getLocale(req), content))
    function tryLocales(locales, content) {
        if (!content.data.sprak || typeof content.data.sprak === 'string') return content.data.sprak;
        return locales.reduce(function(t, el) {
            return t || content.data.sprak.reduce(function(u, el2) {
                if (!u && el2.locale === el.split(";")[0]) u = el2;
                return u
            }, t)
        }, null)
    }

    if ((content.data.hasTableOfContents && content.data.hasTableOfContents !== 'none') || (content.data.metaTags && content.data.metaTags.indexOf('contentType$$$Kort_om') !== -1)) {
        var ch = 1;
        toc = '<nav class="table-of-contents" data-selected-id>' +
            '<h2 class="visuallyhidden" role="heading" aria-level="2">Innholdsfortegnelse</h2><ol>';
        var ind = content.data.text.indexOf('<h3>');
        var count = 0;
        while (ind !== -1 && count < 100) {
            count++;
            var h2End = ind + 4;
            var ssEnd =  content.data.text.indexOf('</h3>',ind);
            var ss = content.data.text.slice(h2End, ssEnd);
            toc += '<li><a href="#chapter-' + ch + '" title="' + ss + '(innholdsfortegnelse)">' + ss +'</a></li>';
            content.data.text = content.data.text.replace('<h3>', '<h2 id="chapter-' + ch++ + '" tabindex="-1" class="chapter-header">');
            content.data.text = content.data.text.replace('</h3>', '</h2>');
            ind = content.data.text.indexOf('<h3>');

        }
        toc += '</ol></nav>';


    }
    var hasFact = false;
    if (content.data.fact && content.data.fact !== '') hasFact = true;
    var model = {
        toc: toc,
        content: content,
        hasFact: hasFact
    };

    // Render a thymeleaf template
    var body = thymeleaf.render(view, model);

    // Return the result
    return {
        body: body
    };
};
