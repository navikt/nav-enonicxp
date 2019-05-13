var thymeleaf = require('/lib/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
// Resolve the view
var view = resolve('oppslagstavle.html');
var langLib = require('/lib/i18nUtil');
var cache = require('/lib/cacheControll');

exports.get = function(req) {
    return cache.getPaths(req.path, 'oppslagstavle', function() {
        var content = portal.getContent();
        var lang = langLib.parseBundle(content.language).oppslagstavle;

        var table = getTableElements(content, 'tableContents').slice(0, content.data.nrTableEntries);

        var col = 'col-md-';
        var ntk = {
            sectionName: lang.niceToKnow,
            data: getContentLists(content, 'ntkContents').slice(0, content.data.nrNTK)
        };
        var news = {
            sectionName: lang.news,
            data: getContentLists(content, 'newsContents')
                .reduce(orderByPublished, [])
                .slice(0, content.data.nrNews)
        };
        var shortcuts = {
            sectionName: lang.shortcuts,
            data: getContentLists(content, 'scContents').slice(0, content.data.nrSC)
        };
        var cont = Number(Boolean(ntk.data)) + Number(Boolean(news.data)) + Number(Boolean(shortcuts.data));
        if (cont === 0) cont = 1;
        col += 12 / cont;

        // Define the model
        var model = {
            table: table,
            nicetoknow: ntk,
            news: news,
            shortcuts: shortcuts,
            col: col
        };

        // Render a thymeleaf template
        var body = thymeleaf.render(view, model);

        // Return the result
        return {
            body: body
        };
    });
};

function getContentLists(content, contentType) {
    if (content.data[contentType]) {
        var section = contentLib.get({
            key: content.data[contentType]
        });

        if (section && section.data.sectionContents) {
            if (Array.isArray(section.data.sectionContents)) {
                return section.data.sectionContents.map(mapElements);
            } else {
                return [section.data.sectionContents].map(mapElements);
            }
        }
    }
    return [];
}

function getTableElements(content, contentType) {
    return (content.data[contentType] ? (Array.isArray(content.data[contentType]) ? content.data[contentType] : [content.data[contentType]]) : []).map(
        mapElements
    );
}

function mapElements(elementId) {
    var el = contentLib.get({ key: elementId });
    return el
        ? {
              isHtml: el.data.ingress ? el.data.ingress.startsWith('<') : false,
              heading: el.displayName || el.data.title,
              icon: 'icon-' + (el.data.icon || 'document'),
              ingress: el.data.ingress || el.data.description || el.data.list_description,
              src: getSrc(el),
              published: el.publish && el.publish.first ? el.publish.first : el.createdTime
          }
        : null;
}

function getSrc(el) {
    var url = el.data.url;
    if (el.data.url) {
        if (el.data.url.indexOf('https://') !== -1 || el.data.url.indexOf('http://') !== -1) {
            var url = el.data.url.toLowerCase().replace(':443', '');
            if (url.indexOf('https://www.nav.no/') === 0 || url.indexOf('http://www.nav.no/') === 0) {
                // TODO this should't be necessary after migration - link cleanup have been run, but its a quick fix for now
                // log.info('url:  ' + url);
                url = decodeURIComponent(url);
                url = url.replace(/\+/g, '-');
                url = url.replace(/,/g, '');
                url = url.replace(/å/g, 'a');
                url = url.replace(/ø/g, 'o');
                url = url.replace(/æ/g, 'ae');
                var path = url.replace('https://', '/').replace('http://', '/');
                // log.info('path: ' + path);
                // log.info('new url: ' + portal.pageUrl({ path: path }));
                return portal.pageUrl({ path: path });
            }
            return url;
        }
        return portal.pageUrl({ path: el.data.url });
    } else {
        return portal.pageUrl({ id: el._id });
    }
}

function orderByPublished(list, element) {
    for (var i = 0; i < list.length; i += 1) {
        if (element && new Date(list[i].published) < new Date(element.published)) {
            list.splice(i, 0, element);
            return list;
        }
    }
    if (element) {
        list.push(element);
    }
    return list;
}
