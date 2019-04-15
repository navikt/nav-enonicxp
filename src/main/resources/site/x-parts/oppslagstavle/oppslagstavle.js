var thymeleaf = require('/lib/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
// Resolve the view
var view = resolve('oppslagstavle.html');
var t = require('/lib/contentTranslator');
var langLib = require('/lib/i18nUtil');

exports.get = function(req) {

    var content = portal.getContent();
    var lang = langLib.parseBundle(content.language).oppslagstavle;

    var table = (getTableElements(content)) ? getTableElements(content).slice(0,content.data.nrTableEntries) : [];

    var col = 'col-md-';
    var ntk = {
        sectionName: lang.niceToKnow,
        data: getNTKElements(content)
    };
    var news = {
        sectionName: lang.news,
        data: getNewsElements(content)
    };
    var shortcuts = {
        sectionName: lang.shortcuts,
        data: getShortCutElements(content)
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
};



function getTableElements(cont) {
    if (cont.data.hasTableItems === 'true') {
        var conf = cont.data;
        var selector = conf.tableSelector;
        if (!selector || selector === 'none') return null;
        var ret = [];
        if (conf.tableContents) ret = getElements(conf.tableContents);
        if (selector === 'true') {
            var query = contentLib.query({
                start: 0,
                count: cont.data.nrTableEntries,
                contentTypes: [
                    app.name + ':main-article'
                ],
                filters: {
                    boolean: {
                        must: {
                            exists: {
                                field: 'data.tablePriority'
                            }
                        }
                    }
                },
                "query": "_path LIKE '/content" + cont._path + "/*'"
            });
            ret = ret.concat(query.hits).map(mapElements).slice(0, cont.data.nrTableEntries)
        }
        else ret = ret.map(mapElements);
        return ret
    }
    return null;
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

            ret = ret.concat(query.hits).map(mapElements).slice(0, nrSub)
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

function mapElements(el) {
    if (el.type === app.name + ':Ekstern_lenke') {
        log.info(portal.pageUrl({path: el.data.url}))
    }
    var e = (el) ? { heading: el.data.heading || el.data.title, icon: el.data.icon || 'icon-document', ingress: el.data.ingress || el.data.description || el.data.list_description, src: (!el.data.url) ? portal.pageUrl({id: el._id}) : portal.pageUrl({path: el.data.url})} : null;
    if (e && e.ingress) {
        e.isHtml = e.ingress.startsWith('<')
    }
    return e
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