
var contentLib = require('/lib/xp/content');
var R = require('/lib/ramda');
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
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'form-and-application', ns.reduce(function (t, el) {
        if (el) t.push(el);
        return t
    },[]));
    delete content.data.newschemas;
    if (content.data.forms) delete content.data.forms;
    return content;
}
exports.changeLaws = changeLaws;
function changeLaws(content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'rules-and-regulations', content.data.laws);
    delete content.data.laws;
    return content;
}
exports.changeInternational = changeInternational;
function changeInternational(content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'international', content.data.international);
    delete content.data.international;
    return content;
}
exports.changeProcedural = changeProcedural;
function changeProcedural(content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'saksbehandling', content.data.saksbehandling);
    delete content.data.saksbehandling;
    return content;
}

exports.changeSelfService = changeSelfService
function changeSelfService(content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'selfservice', content.data.selfservice);
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
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'membership', content.data.membership);
    delete content.data.membership;
    return content;
}
exports.changeQA = changeQA
function changeQA(content) {
    //content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'Spørsmål og svar', content.data.faq);
    delete content.data.faq;
    return content;
}
exports.changeNotifications = changeNotifications
function changeNotifications(content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'report-changes', content.data.notifications);
    delete content.data.notifications;
    return content;
}
exports.changeAppeals = changeAppeals;
function changeAppeals(content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'appeal-rights', content.data.appeals);
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
    var selected = R.path(['data', 'menuListItems', '_selected'], content);
    if (!selected) return content;
    //var selected = content.data.menuListItems._selected;
    selected = Array.isArray(selected) ? selected : [selected];
    selected.forEach(function (value) {
        if (!realyIs(content.data.menuListItems[value].link)) {
            delete content.data.menuListItems[value];
        }
    });
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
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.links);
    delete content.data.links;
    return content;
}
exports.changeInformation = changeInformation;
function changeInformation(content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.information);
    delete content.data.information;
    return content;
}
exports.changeRates = changeRates
function changeRates(content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'rates', content.data.rates);
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
    else if (typeof content !== 'object') return content;
    return JSON.stringify(content, null, 4);
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
        content.data.menuListItems = addMenuListItem(content.menuListItems, name, items);
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
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.shortcuts);
    delete content.data.shortcuts;
    return content;
}

exports.createNewTableContent = createNewTableContent;
function createNewTableContent(tableElements, ntkElements, newElements, scElements, content) {
    var data = {
        nrTableEntries: tableElements.length,
        tableContents: tableElements,
        ntkContents: ntkElements.map(mapIds),
        newsContents: newElements.map(mapIds),
        scContents: scElements.map(mapIds),
        nrNews: newElements.length,
        nrNTK: ntkElements.length,
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
        log.info(JSON.stringify(contentLib.get({ key: value._id}), null, 4));
        log.info('Failed modify ' + e);
        log.info(newId + ' ' + oldId);
    }
}

exports.addMenuListItem = addMenuListItem;
function addMenuListItem(menuListItems, name, links) {
    links = links ? Array.isArray(links) ? links : [links] : [];
    if (!menuListItems) {
        menuListItems = {
            _selected: []
        }
    }
    if (!menuListItems._selected) {
        menuListItems = {
            _selected: []
        }
    }
    if (links.length > 0) {
        if (menuListItems._selected.indexOf(name) === -1) {
            menuListItems._selected.push(name);
        }
        menuListItems[name] = {
            link: Array.isArray(links) ? links : [links]
        };
    }
    return menuListItems;
}
