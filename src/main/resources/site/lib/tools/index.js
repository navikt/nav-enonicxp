
var contentLib = require('/lib/xp/content');
exports.verifyPaths = verifyPaths;
function verifyPaths(object) {
    var tmp= undefined;
    for (var k in arguments) {
        if (arguments.hasOwnProperty(k)) {
            if (!tmp) tmp = arguments[k];
            else tmp = tmp[arguments[k]];
            if (!tmp) return false;
        }

    }
    return true;
}
exports.varifyTableListContent =varifyTableListContent
function varifyTableListContent(content) {
    return content.hasOwnProperty('data') && content.data.hasOwnProperty('sectionContents')
}
exports.inspectContent = inspectContent;
function inspectContent(content) {
    log.info(logBeutify(content));

    if (verifyPaths(content, 'x', 'no-nav-navno', 'cmsMenu', 'menuKey')) {
        log.info('MenuItem');
        log.info(logBeutify(utils.getContentByMenuKey(content.x['no-nav-navno'].cmsMenu.menuKey)))
    }
    if (verifyPaths(content, 'data', 'sectionContents')) {
        var sids = (Array.isArray(content.data.sectionContents)) ? content.data.sectionContents : [content.data.sectionContents];
        sids.forEach(function (value) {
            log.info('Inspecting: ' + value);
            log.info(logBeutify(contentLib.get({
                key: value
            })))
        })
    }
}
exports.join = join;
function join(a, b) {
    var set = {
        a:{},
        b:{},
        u:{}
    };
    for (var k in a) {
        if (a.hasOwnProperty(k) && !b.hasOwnProperty(k)) set.a[k] = a[k];
        else if (a.hasOwnProperty(k) && b.hasOwnProperty(k)) set.u[k] = [a[k],b[k]]
    }
    for (var l in b) {
        if (!a.hasOwnProperty(l) && b.hasOwnProperty(l)) set.b[l] = b[l];
    }
    var ret = {};
    for (var m in set.a) {
        if (set.a.hasOwnProperty(m)) ret[m] = set.a[m];
    }
    for (var n in set.b) {
        if (set.b.hasOwnProperty(n)) ret[n] = set.b[n];
    }
    for (var o in set.u) {
        if (set.u.hasOwnProperty(o)) {
            ret[o] = set.u[o];

        }
    }
    return ret;

}
exports.changeSocial = changeSocial;
function changeSocial(content) {
    var ret = [];
    if (content.data.hasOwnProperty('share-facebook')) {
        if (content.data['share-facebook']) ret.push('facebook');
        delete content.data['share-facebook']
    }
    if (content.data.hasOwnProperty('share-twitter')) {
        if (content.data['share-twitter']) ret.push('twitter');
        delete content.data['share-twitter']
    }
    if (content.data.hasOwnProperty('share-linkedin')) {
        if (content.data['share-linkedin']) ret.push('linkedin');
        delete content.data['share-linkedin']
    }
    if (ret.length !== 0) content.data.social = ret;
    return content;
}
exports.changeTilbakemelding = changeTilbakemelding;
function changeTilbakemelding(content) {
    content.data.tilbakemelding = content.data['vis-tilbakemelding'];
    delete content.data['vis-tilbakemelding'];
    return content;
}
exports.changeNewsSchemas = changeNewsSchemas;
function changeNewsSchemas(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    var ns = content.data.newsschemas;
    if (!Array.isArray(ns)) ns = [ns];
    content.data.menuListItems.push({menuListName: 'Skjema og søknad', link: ns.reduce(function (t, el) {
            if (el) t.push(el);
            return t
        },[])});
    delete content.data.newschemas;
    if (content.data.forms) delete content.data.forms;
    return content;
}
exports.changeLaws = changeLaws;
function changeLaws(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({'menuListName': 'Regelverk', 'link': content.data.laws});
    delete content.data.laws;
    return content;
}
exports.changeInternational = changeInternational;
function changeInternational(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({'menuListName': 'Internasjonalt', 'link': content.data.international});
    delete content.data.international;
    return content;
}
exports.changeSelfService = changeSelfService
function changeSelfService(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({'menuListName': 'Selvbetjening', 'link': content.data.selfservice});
    delete content.data.selfservice;
    return content;
}
exports.changeLanguageVersions = changeLanguageVersions
function changeLanguageVersions(content) {
    return changeLanguage(content);
}
exports.changeLanguage = changeLanguage
function changeLanguage(content) {
    delete content.data.language;
    return content;
}
exports.changeMembership = changeMembership
function changeMembership(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({'menuListName': 'Medlemskap i folketrygden', 'link': content.data.membership});
    delete content.data.membership;
    return content;
}
exports.changeQA = changeQA
function changeQA(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({'menuListName': 'Spørsmål og svar', 'link': content.data.faq});
    delete content.data.faq;
    return content;
}
exports.changeNotifications = changeNotifications
function changeNotifications(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({'menuListName': 'Meld fra om endringer', 'link': content.data.notifications});
    delete content.data.notifications;
    return content;
}
exports.changeAppeals = changeAppeals;
function changeAppeals(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({'menuListName': 'Klagerettigheter', 'link': content.data.appeals});
    delete content.data.appeals;
    return content;
}
exports.changeHideDate = changeHideDate;
function changeHideDate(content) {
    delete content.data['hide_date'];
    return content;
}

exports.realyIs = realyIs
function realyIs(link) {
    if (!link) return link;
    else if (typeof link === 'string') return (link);
    else return (link.length)
}
exports.mapReduceMenuItems = mapReduceMenuItems;
function mapReduceMenuItems(content) {
    content.data.menuListItems = content.data.menuListItems.reduce(function(t,el) {
        if (realyIs(el.link)) t.push(el);
        return t;
    },[]);
    return content;
}
exports.insertMetaTag = insertMetaTag;
function insertMetaTag(content, key, value) {
    content.data.metaTags = content.data.metaTags || [];
    if (!Array.isArray(content.data.metaTags)) content.data.metaTags = [content.data.metaTags];
    content.data.metaTags.push(key + '$$$' + value);
    return content
}
exports.insertContentTypeMetaTag = insertContentTypeMetaTag;
function insertContentTypeMetaTag(content) {
    return insertMetaTag(content, 'contentType', content.type.replace(app.name + ':', ""));
}



exports.changePreface = changePreface;
function changePreface(content) {
    content.data.ingress = content.data.preface;
    delete content.data.preface;
    return content;
}
exports.changeTitle = changeTitle;
function changeTitle(content) {
    content.data.heading = content.data.title;
    delete content.data.title;
    return content;
}

exports.changeLinks = changeLinks;
function changeLinks(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({menuListName: 'Relatert innhold', link: content.data.links});
    delete content.data.links;
    return content;
}
exports.changeInformation = changeInformation;
function changeInformation(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({menuListName: 'Relatert informasjon', link: content.data.information});
    delete content.data.information;
    return content;
}
exports.changeRates = changeRates
function changeRates(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    content.data.menuListItems.push({menuListName: 'Satser', link: content.data.rates});
    delete content.data.rates;
    return content;
}
exports.changeFactPlacement = changeFactPlacement
function changeFactPlacement(content) {
    content.data.factLocation = content.data.fact_placement;
    if (content.data.factLocation === 'sidebar') content.data.factLocation = 'left';
    else if (content.data.factLocation === 'maincol') content.data.factLocation = 'bottom';
    delete content.data.fact_placement;
    return content;
}

exports.reduceNullElements = reduceNullElements;
function reduceNullElements(t, el) {
    if (el) t.push(el);
    return t;
}

exports.mapIds = mapIds;
function mapIds(el) {
    if (el) return el._id;
    return null
}

String.prototype.repeat = function (nr) {
    var ret = '';
    for (var i = 0; i < nr; i++) {
        ret += this.valueOf()
    }
    return ret;
}
exports.logBeautify = function(content) {
    log.info(logBeutify(content));
}
function logBeutify(content) {
    if (!content) return "content undefined";
    var string = JSON.stringify(content);
    var ret = ""
    var tn = 0;
    var t = '  ';
    var n = '\n';
    return string.split("").map(function (value) {
        if (value === '[' || value === '{') return t.repeat(t) + value + n + t.repeat(++tn)
        else if (value === ']' || value === '}') return t.repeat(--tn) + value + n + t.repeat(tn)
        else if (value === ',') return  value + n + t.repeat(tn)
        return value
    }).reduce(function(t, c) {
        return t + c;
    },ret)
}

exports.changeMenuItem = changeMenuItem;
function changeMenuItem(content, name, from) {
    content.data.menuListItems = content.data.menuListItems || [];
    var items = (content.data[from]) ?
        (typeof content.data[from] === 'string') ?
            [content.data[from]] :
            (Array.isArray(content.data[from])) ?
                (content.data[from].length > 0) ?
                    content.data[from] :
                    undefined :
                undefined :
        undefined;
    if (items) {
        content.data.menuListItems.push({menuListName: name, link: items});
    }
    delete content.data[from];
    return content;
}
exports.change = change;
function change(content, to, from) {
    content.data[to] = content.data[from];
    delete content.data[from];
    return content;
}
exports.changeDescription = changeDescription;
function changeDescription(content) {
    content.data.ingress = content.data.description;
    delete content.data.description;
    return content;
}
exports.createTableListContent = createTableListContent;
function createTableListContent(content) {
    var newContent = {
        name: content._name,
        displayName: content.displayName,
        parentPath:  '/www.nav.no/tmp/',
        contentType: 'no.nav.navno:tavleliste',
        data: content.data,
        x: content.x
    };
    return contentLib.create(newContent);
}
exports.changeShortcuts = changeShortcuts;
function changeShortcuts(content) {
    content.data.menuListItems = content.data.menuListItems || [];
    if (!Array.isArray(content.data.menuListItems)) content.data.menuListItems = [content.data.menuListItems];
    content.data.menuListItems.push({menuListName: 'Relatert innhold', link: content.data.shortcuts});

    delete content.data.shortcuts;
    return content;
}

exports.createNewTableContent = createNewTableContent;
function createNewTableContent(tableElements, ntkElements, newElements, scElements, content) {

    var data = {
        hasTableItems: (tableElements.length > 0) ? "true": 'false',
        heading: content.title || content.heading || content.displayName,
        nrTableEntries: tableElements.length,
        tableContents: tableElements,
        ntkContents: ntkElements.map(mapIds),
        newsContents: newElements.map(mapIds),
        scContents: scElements.map(mapIds),
        ntkSelector: 'true',
        tableSelector: 'true',
        hasNewsElements: (newElements.length > 0) ? 'true': 'false',
        newsSelector: 'true',
        nrNews: newElements.length,
        hasNTKElements: (ntkElements.length > 0) ? 'true' : 'false',
        nrNTK: ntkElements.length,
        hasSCElements: (scElements.length > 0) ? 'true' : 'false',
        scSelector: 'true',
        nrSC: scElements.length

    };
    return data;

    var newContent = {
        name: content._name,
        displayName: content.displayName,
        parentPath:  '/sites/www.nav.no/no/test/',
        contentType: app.name + ':oppslagstavle',
        data: data,
        x: content.x
    }

    if (content.language) newContent.language = content.language;
    var mod
    try {
        var resObj = contentLib.create(newContent);
        mod = contentLib.modify({
            key: resObj._id,
            editor: function (c) {
                c.x = content.x
                return c;
            }

        });
        log.info("Try to include x");
        log.info(logBeutify(mod))
    } catch(e) {
        log.info("Failed at createNewTableContent");
        log.info(e);
        log.info(logBeutify(content));
        log.info(logBeutify(newContent));
        return content
    }

    return mod


}
exports.getTableElements = getTableElements;
function getTableElements(content) {
    if (!content) {
        return []
    }
    if (typeof content.data.sectionContents === 'string') content.data.sectionContents = [ content.data.sectionContents];


    return (content.data.sectionContents) ? contentLib.query({
        filters: {
            ids: {  values: content.data.sectionContents }
        }
    }).hits.map(mapIds).reduce(reduceNullElements,[]) : [];

}



exports.moveNewContent = moveNewContent;
function moveNewContent(newContent, path) {

    return contentLib.move({
        source: newContent._id,
        target: "/" + path.split("/").slice(0,-1).join("/") + "/"
    });
}

exports.getRefs = getRefs;
function getRefs(content) {
    var re = [];
    var start = 0;
    var count = 20;
    var length = 20;
    while (length === 20) {
        var res = contentLib.query({
            start: start,
            count: count,
            query: '_references LIKE "' + content._id + '"'
        });
        re = re.concat(res.hits);
        length = res.count;
        start += 20;
    }

    return re.map(function (el) {
        return (re.indexOf({_id: el._id}) === -1) ? { _id: el._id} : null
    }).reduce(reduceNullElements,[]);
}


function checkTextForRefs(content) {
    var start = 0;
    var length = 100;
    var ret = [];
    var query;
    while (length === 100) {
        query = contentLib.query({
            start: start,
            length: length,
            query: "fulltext('data.text', 'href=\\\"content://" + content._id + "*', 'OR')"
        });

        ret = ret.concat(query.hits);
        length = query.hits.length;
        start += length;
    }
    return ret.map(function (el) {
        return {_id: el._id}
    });
}

exports.deleteOldContent = deleteOldContent
function deleteOldContent(content, newPath) {
    var children = contentLib.getChildren({
        key: content._id
    });
    var ids = (children.count > 0) ? children.hits.map(mapIds) : [];
    ids.forEach(function(id) {
        contentLib.move({
            source: id,
            target: newPath + "/"
        })
    });
    contentLib.delete({
        key: content._id
    })
}
exports.modify = modify;
function modify(value, newId, oldId) {

    log.info("Modify " + value._id);
    try {
        var r = contentLib.modify({
            key: value._id,
            editor: function (c) {
                return JSON.parse(JSON.stringify(c).replace(new RegExp(oldId, 'g'), newId));
            }
        });
    } catch (e) {
        log.info(logBeutify(value))
        log.info('Failed modify');
        log.info(newId + ' ' + oldId);
    }
}