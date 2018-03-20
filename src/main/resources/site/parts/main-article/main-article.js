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
