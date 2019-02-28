var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
// Resolve the view
var view = resolve('oppslagstavle.html');
var t = require('/lib/contentTranslator');
var langLib = require('/lib/i18nUtil');
var cache = require('/lib/cacheControll');

exports.get = function(req) {
    return cache.getPaths('oppslagstavle' + req.path, function () {
        var content = portal.getContent();
        var lang = langLib.parseBundle(content.language).oppslagstavle;

        var table = getTableElements(content, 'tableContents').slice(0,content.data.nrTableEntries);

        var col = 'col-md-';
        var ntk = {
            sectionName: lang.niceToKnow,
            data:  getTableElements(content, 'ntkContents').slice(0,content.data.nrNTK)
        };
        var news = {
            sectionName: lang.news,
            data:  getTableElements(content, 'newsContents').slice(0,content.data.nrNews)
        };
        var shortcuts = {
            sectionName: lang.shortcuts,
            data: getTableElements(content, 'scContents').slice(0,content.data.nrSC)
        };
        var cont = Number(Boolean(ntk.data)) + Number(Boolean(news.data)) + Number(Boolean(shortcuts.data));
        if (cont === 0) cont = 1;
        col += 12/cont;

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
    })

};



function getTableElements(cont, elements) {
    return (cont.data[elements] ? Array.isArray(cont.data[elements]) ? cont.data[elements] : [ cont.data[elements] ] : []).map(mapElements)
}

function getNTKElements(cont) {

    if (cont.data.hasNTKElements === 'true') {
        var nrSub = cont.data.nrNTK;
        var conf = cont.data;
        var selector = conf.ntkSelector;
        if (!selector || selector === 'none') return null;
        var ret = [];
        if (conf.ntkContents) {
            ret = getElements(conf.ntkContents);
        }
        if (selector === 'true') {
            var query = contentLib.query({
                start: 0,
                count: 5,
                contentTypes: [
                    app.name + ':main-article'
                ],
                filters: {
                    boolean: {
                        must: {
                            exists: {
                                field: 'data.ntkPriority'
                            }
                        }
                    }
                },
                "query": "_path LIKE '/content" + cont._path + "/*'",
                sort: "data.ntkPriority DESC"
            });

            ret = ret.concat(query.hits).reduce(function (t, el) {

            }).map(mapElements).slice(0, nrSub)
        }
        return ret;

    }
    return null;
}

function getNewsElements(cont) {
    if (cont.data.hasNewsElements === 'true') {
        var nrSub = cont.data.nrNews;
        var conf = cont.data;
        var selector = conf.newsSelector;
        if (!selector || selector === 'none') return null;
        var ret = [];
        if (conf.newsContents) ret = getElements(conf.newsContents);
        if (selector === 'true') {
            var query = contentLib.query({
                start: 0,
                count: 5,
                contentTypes: [
                    app.name + ':main-article'
                ],
                filters: {
                    boolean: {
                        must: {
                            exists: {
                                field: 'data.newsPriority'
                            }
                        },
                        mustNot: {
                            hasValue: {
                                field: 'data.newsPriority',
                                values: [ 'false' ]
                            }
                        }
                    }
                },
                "query": "_path LIKE '/content" + cont._path + "/*'",
                sort: 'modifiedTime DESC'
            });

            ret = ret.concat(query.hits).map(mapElements).slice(0, nrSub)
        }
        return ret
    }
    return null;
}
function getShortCutElements(cont) {
    if (cont.data.hasSCElements === 'true') {
        var nrSub = cont.data.nrSC;
        var conf = cont.data;
        var selector = conf.scSelector;
        if (!selector || selector === 'none') return null;
        var ret = [];
        if (conf.scContents) {
            ret = getElements(conf.scContents);
        }
        if (selector === 'true') {
            var query = contentLib.query({
                start: 0,
                count: 5,
                contentTypes: [
                    app.name + ':main-article'
                ],
                filters: {
                    boolean: {
                        must: {
                            exists: {
                                field: 'data.scPriority'
                            }
                        }
                    }
                },
                "query": "_path LIKE '/content" + cont._path + "/*'",
                sort: 'data.scPriority DESC'
            });

            ret = ret.concat(query.hits).map(mapElements).slice(0, nrSub)
        }
        return ret;

    }
    return null;
}

function getElements(els) {
    if (typeof els === 'string') els = [els];
    return els.map(function (el) {
        return contentLib.get({key: el});
    }).reduce(reduceOldElements,[]);
}

function mapElements(els) {
    var el = contentLib.get({key: els});
    return (el) ? { isHtml: el.data.ingress? el.data.ingress.startsWith('<'): false, heading: el.displayName || el.data.title, icon: el.data.icon || 'icon-document', ingress: el.data.ingress || el.data.description || el.data.list_description, src: (!el.data.url) ? portal.pageUrl({id: el._id}) : portal.pageUrl({path: el.data.url})} : null;
}
function removeNullElements(t, el) {
    if (el) t.push(el);
    return t;
}

function reduceOldElements(t, el) {
    if (!el) return t;
    else if (el.publish && el.publish.to) {
        var d = new Date();
        var n = new Date(el.publish.to);
        if (d<n) t.push(el)
    }
    else t.push(el);
    return t;
}
