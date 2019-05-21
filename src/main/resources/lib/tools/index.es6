var contentLib = require('/lib/xp/content');
var valueLib = require('/lib/xp/value');
var contextLib = require('/lib/xp/context');
var utils = require('/lib/nav-utils');

var nodeLib = require('/lib/xp/node');
var repo = nodeLib.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});

exports.verifyPaths = verifyPaths;
function verifyPaths () {
    var tmp;
    for (var k in arguments) {
        if (arguments.hasOwnProperty(k)) {
            if (!tmp) {
                tmp = arguments[k];
            } else {
                tmp = tmp[arguments[k]];
            }
            if (!tmp) {
                return false;
            }
        }
    }
    return true;
}
exports.varifyTableListContent = varifyTableListContent;
function varifyTableListContent (content) {
    return content.hasOwnProperty('data') && content.data.hasOwnProperty('sectionContents');
}
exports.inspectContent = inspectContent;
function inspectContent (content) {
    log.info(logBeutify(content));

    if (verifyPaths(content, 'x', 'no-nav-navno', 'cmsMenu', 'menuKey')) {
        log.info('MenuItem');
        log.info(logBeutify(utils.getContentByMenuKey(content.x['no-nav-navno'].cmsMenu.menuKey)));
    }
    if (verifyPaths(content, 'data', 'sectionContents')) {
        var sids = Array.isArray(content.data.sectionContents) ? content.data.sectionContents : [content.data.sectionContents];
        sids.forEach(function (value) {
            log.info('Inspecting: ' + value);
            log.info(
                logBeutify(
                    contentLib.get({
                        key: value,
                    })
                )
            );
        });
    }
}
exports.join = join;
function join (a, b) {
    var set = {
        a: {

        },
        b: {

        },
        u: {

        },
    };
    for (var k in a) {
        if (a.hasOwnProperty(k) && !b.hasOwnProperty(k)) {
            set.a[k] = a[k];
        } else if (a.hasOwnProperty(k) && b.hasOwnProperty(k)) {
            set.u[k] = [a[k], b[k]];
        }
    }
    for (var l in b) {
        if (!a.hasOwnProperty(l) && b.hasOwnProperty(l)) {
            set.b[l] = b[l];
        }
    }
    var ret = {

    };
    for (var m in set.a) {
        if (set.a.hasOwnProperty(m)) {
            ret[m] = set.a[m];
        }
    }
    for (var n in set.b) {
        if (set.b.hasOwnProperty(n)) {
            ret[n] = set.b[n];
        }
    }
    for (var o in set.u) {
        if (set.u.hasOwnProperty(o)) {
            ret[o] = set.u[o];
        }
    }
    return ret;
}
exports.changeSocial = changeSocial;
function changeSocial (content) {
    var ret = [];
    if (content.data.hasOwnProperty('share-facebook')) {
        if (content.data['share-facebook']) {
            ret.push('facebook');
        }
        delete content.data['share-facebook'];
    }
    if (content.data.hasOwnProperty('share-twitter')) {
        if (content.data['share-twitter']) {
            ret.push('twitter');
        }
        delete content.data['share-twitter'];
    }
    if (content.data.hasOwnProperty('share-linkedin')) {
        if (content.data['share-linkedin']) {
            ret.push('linkedin');
        }
        delete content.data['share-linkedin'];
    }
    if (ret.length !== 0) {
        content.data.social = ret;
    }
    return content;
}
exports.changeTilbakemelding = changeTilbakemelding;
function changeTilbakemelding (content) {
    content.data.tilbakemelding = content.data['vis-tilbakemelding'];
    delete content.data['vis-tilbakemelding'];
    return content;
}
exports.changeNewsSchemas = changeNewsSchemas;
function changeNewsSchemas (content) {
    content.data.menuListItems = content.data.menuListItems || [];
    var ns = content.data.newsschemas;
    if (!Array.isArray(ns)) {
        ns = [ns];
    }
    content.data.menuListItems = addMenuListItem(
        content.data.menuListItems,
        'form-and-application',
        ns.reduce(function (t, el) {
            if (el) {
                t.push(el);
            }
            return t;
        }, [])
    );
    delete content.data.newschemas;
    if (content.data.forms) {
        delete content.data.forms;
    }
    return content;
}
exports.changeLaws = changeLaws;
function changeLaws (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'rules-and-regulations', content.data.laws);
    delete content.data.laws;
    return content;
}
exports.changeInternational = changeInternational;
function changeInternational (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'international', content.data.international);
    delete content.data.international;
    return content;
}
exports.changeProcedural = changeProcedural;
function changeProcedural (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'saksbehandling', content.data.saksbehandling);
    delete content.data.saksbehandling;
    return content;
}

exports.changeSelfService = changeSelfService;
function changeSelfService (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'selfservice', content.data.selfservice);
    delete content.data.selfservice;
    return content;
}
exports.changeLanguageVersions = changeLanguageVersions;
function changeLanguageVersions (content) {
    return changeLanguage(content);
}
exports.changeLanguage = changeLanguage;
function changeLanguage (content) {
    delete content.data.language;
    return content;
}
exports.changeMembership = changeMembership;
function changeMembership (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'membership', content.data.membership);
    delete content.data.membership;
    return content;
}
exports.changeQA = changeQA;
function changeQA (content) {
    // content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'Spørsmål og svar', content.data.faq);
    delete content.data.faq;
    return content;
}
exports.changeNotifications = changeNotifications;
function changeNotifications (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'report-changes', content.data.notifications);
    delete content.data.notifications;
    return content;
}
exports.changeAppeals = changeAppeals;
function changeAppeals (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'appeal-rights', content.data.appeals);
    delete content.data.appeals;
    return content;
}
exports.changeHideDate = changeHideDate;
function changeHideDate (content) {
    delete content.data['hide_date'];
    return content;
}

exports.realyIs = realyIs;
function realyIs (link) {
    if (!link) {
        return link;
    } else if (typeof link === 'string') {
        return link;
    } else {
        return link.length;
    }
}
exports.mapReduceMenuItems = mapReduceMenuItems;
function mapReduceMenuItems (content) {
    var selected;
    if (content && content.data && content.data.menuListItems && content.data.menuListItems._selected) {
        selected = content.data.menuListItems._selected;
    }
    if (!selected) {
        return content;
    }
    // var selected = content.data.menuListItems._selected;
    selected = Array.isArray(selected) ? selected : [selected];
    selected.forEach(function (value) {
        if (!realyIs(content.data.menuListItems[value].link)) {
            delete content.data.menuListItems[value];
        }
    });
    return content;
}
exports.insertMetaTag = insertMetaTag;
function insertMetaTag (content, key, value) {
    content.data.metaTags = content.data.metaTags || [];
    if (!Array.isArray(content.data.metaTags)) {
        content.data.metaTags = [content.data.metaTags];
    }
    content.data.metaTags.push(key + '$$$' + value);
    return content;
}
exports.insertContentTypeMetaTag = insertContentTypeMetaTag;
function insertContentTypeMetaTag (content) {
    return insertMetaTag(content, 'contentType', content.type.replace(app.name + ':', ''));
}

exports.changePreface = changePreface;
function changePreface (content) {
    content.data.ingress = content.data.preface;
    delete content.data.preface;
    return content;
}
exports.changeTitle = changeTitle;
function changeTitle (content) {
    content.data.heading = content.data.title;
    delete content.data.title;
    return content;
}

exports.changeLinks = changeLinks;
function changeLinks (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.links);
    delete content.data.links;
    return content;
}
exports.changeInformation = changeInformation;
function changeInformation (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.information);
    delete content.data.information;
    return content;
}
exports.changeRates = changeRates;
function changeRates (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'rates', content.data.rates);
    delete content.data.rates;
    return content;
}
exports.changeFactPlacement = changeFactPlacement;
function changeFactPlacement (content) {
    content.data.factLocation = content.data.fact_placement;
    if (content.data.factLocation === 'sidebar') {
        content.data.factLocation = 'left';
    } else if (content.data.factLocation === 'maincol') {
        content.data.factLocation = 'bottom';
    }
    delete content.data.fact_placement;
    return content;
}

exports.reduceNullElements = reduceNullElements;
function reduceNullElements (t, el) {
    if (el) {
        t.push(el);
    }
    return t;
}

exports.mapIds = mapIds;
function mapIds (el) {
    if (el) {
        return el._id;
    }
    return null;
}

exports.logBeautify = function (content) {
    log.info(logBeutify(content));
};
function logBeutify (content) {
    if (!content) {
        return 'content undefined';
    } else if (typeof content !== 'object') {
        return content;
    }
    return JSON.stringify(content, null, 4);
}

exports.changeMenuItem = changeMenuItem;
function changeMenuItem (content, name, from) {
    content.data.menuListItems = content.data.menuListItems || [];
    var items = content.data[from]
        ? typeof content.data[from] === 'string'
            ? [content.data[from]]
            : Array.isArray(content.data[from])
                ? content.data[from].length > 0
                    ? content.data[from]
                    : undefined
                : undefined
        : undefined;
    if (items) {
        content.data.menuListItems = addMenuListItem(content.menuListItems, name, items);
    }
    delete content.data[from];
    return content;
}
exports.change = change;
function change (content, to, from) {
    content.data[to] = content.data[from];
    delete content.data[from];
    return content;
}
exports.changeDescription = changeDescription;
function changeDescription (content) {
    content.data.ingress = content.data.description;
    delete content.data.description;
    return content;
}
exports.createTableListContent = createTableListContent;
function createTableListContent (content) {
    var newContent = {
        name: content._name,
        displayName: content.displayName,
        parentPath: '/www.nav.no/tmp/',
        contentType: 'no.nav.navno:tavleliste',
        data: content.data,
        x: content.x,
    };
    return contentLib.create(newContent);
}
exports.changeShortcuts = changeShortcuts;
function changeShortcuts (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.shortcuts);
    delete content.data.shortcuts;
    return content;
}

exports.createNewTableContent = createNewTableContent;
function createNewTableContent (tableElements, ntkElementId, newElementId, scElementId, content) {
    var data = {
        nrTableEntries: tableElements.length,
        tableContents: tableElements,
        nrNTK: 5,
        nrSC: 5,
        nrNews: 3,
    };
    if (ntkElementId) {
        data.ntkContents = ntkElementId;
    }
    if (newElementId) {
        data.newsContents = newElementId;
    }
    if (scElementId) {
        data.scContents = scElementId;
    }
    return data;
}
exports.getTableElements = getTableElements;
function getTableElements (content) {
    if (!content) {
        return [];
    }
    if (typeof content.data.sectionContents === 'string') {
        content.data.sectionContents = [content.data.sectionContents];
    }

    return content.data.sectionContents
        ? contentLib
            .query({
                filters: {
                    ids: {
                        values: content.data.sectionContents,
                    },
                },
            })
            .hits.map(mapIds)
            .reduce(reduceNullElements, [])
        : [];
}

exports.moveNewContent = moveNewContent;
function moveNewContent (newContent, path) {
    return contentLib.move({
        source: newContent._id,
        target:
            '/' +
            path
                .split('/')
                .slice(0, -1)
                .join('/') +
            '/',
    });
}

exports.getRefs = getRefs;
function getRefs (content) {
    var re = [];
    var start = 0;
    var count = 20;
    var length = 20;
    while (length === 20) {
        var res = contentLib.query({
            start: start,
            count: count,
            query: '_references LIKE "' + content._id + '"',
        });
        re = re.concat(res.hits);
        length = res.count;
        start += 20;
    }

    return re
        .map(function (el) {
            return re.indexOf({
                _id: el._id,
            }) === -1
                ? {
                    _id: el._id,
                }
                : null;
        })
        .reduce(reduceNullElements, []);
}

exports.deleteOldContent = deleteOldContent;
function deleteOldContent (content, newPath) {
    var children = repo
        .findChildren({
            parentKey: content._id,
            start: 0,
            count: 100,
        })
        .hits.map(function (c) {
            return repo.get(c.id);
        });
    children.forEach(function (child) {
        repo.move({
            source: child._id,
            target: '/content' + newPath + '/',
        });
    });
    contentLib.delete({
        key: content._id,
    });
}
exports.modify = modify;
function modify (value, newId, oldId) {
    try {
        repo.modify({
            key: value._id,
            editor: function (c) {
                var contentString = JSON.stringify(c);
                contentString = contentString.replace(new RegExp(oldId, 'g'), newId);
                var content = JSON.parse(contentString);
                // dates are somehow removed on content, so we have to get them from the original c instead
                if (c.createdTime) {
                    content.createdTime = valueLib.instant(c.createdTime);
                }
                if (c.modifiedTime) {
                    content.modifiedTime = valueLib.instant(c.modifiedTime);
                }
                if (c.publish) {
                    content.publish = c.publish;
                    if (c.publish.first) {
                        content.publish.first = valueLib.instant(c.publish.first);
                    }
                    if (c.publish.from) {
                        content.publish.from = valueLib.instant(c.publish.from);
                    }
                    if (c.publish.to) {
                        content.publish.to = valueLib.instant(c.publish.to);
                    }
                }
                return content;
            },
        });
    } catch (e) {
        log.info(
            JSON.stringify(
                contentLib.get({
                    key: value._id,
                }),
                null,
                4
            )
        );
        log.info('Failed modify ' + e);
        log.info(newId + ' ' + oldId);
    }
}

exports.addMenuListItem = addMenuListItem;
function addMenuListItem (menuListItems, name, links) {
    links = links ? (Array.isArray(links) ? links : [links]) : [];
    if (!menuListItems) {
        menuListItems = {
            _selected: [],
        };
    }
    if (!menuListItems._selected) {
        menuListItems = {
            _selected: [],
        };
    }
    if (links.length > 0) {
        if (menuListItems._selected.indexOf(name) === -1) {
            menuListItems._selected.push(name);
        }
        menuListItems[name] = {
            link: Array.isArray(links) ? links : [links],
        };
    }
    return menuListItems;
}

exports.getRefInfo = getRefInfo;
function getRefInfo (contentId) {
    var refs = contentLib.query({
        start: 0,
        count: 1000,
        query: '_references = "' + contentId + '" OR fulltext("*", "' + contentId + '", "AND") ',
    }).hits;

    var refIds = getRefsInRefMap(contentId);
    var refsFromRefMap = contentLib.query({
        start: 0,
        count: refIds.length,
        filters: {
            ids: {
                values: refIds,
            },
        },
    }).hits;

    refsFromRefMap.forEach(function (r) {
        var inRefs = false;
        refs.forEach(function (ref) {
            if (ref._id === r._id) {
                inRefs = true;
            }
        });
        if (!inRefs) {
            refs.push(r);
        }
    });

    var refInfo = {
        total: refs.length,
        paths: [],
        pathsExtd: [],
    };

    refs.forEach(function (hit) {
        var ref = findRefPathInContent('', null, hit, contentId);
        var refKey = ref.key;
        refInfo.paths.push(ref.path);
        if (!refInfo[refKey]) {
            refInfo[refKey] = 0;
        }
        refInfo[refKey] += 1;
        refInfo.pathsExtd.push({
            id: hit._id,
            path: hit._path,
            displayName: hit.displayName,
            type: hit.type,
            status: hit.x ? (hit.x['no-nav-navno'] ? (hit.x['no-nav-navno'].cmsStatus ? hit.x['no-nav-navno'].cmsStatus.status : null) : null) : null,
        });
    });

    return refInfo;
}

function findRefPathInContent (path, key, o, id) {
    var addToPath = function (path, key) {
        if (path) {
            return path + '.' + key;
        }
        return key;
    };
    if (typeof o === 'object') {
        // check arrays
        if (Array.isArray(o)) {
            for (var i = 0; i < o.length; i += 1) {
                if (typeof o[i] === 'object') {
                    var ref = findRefPathInContent(addToPath(path, key), i, o[i], id);
                    if (ref.key) {
                        return ref;
                    }
                }
                if (o[i] === id || (typeof o[id] === 'string' && o[id].indexOf(id))) {
                    return {
                        path: addToPath(path, key + '.' + i),
                        key: key,
                    };
                }
            }
        }
        // check objects
        for (var subKey in o) {
            if (typeof o[subKey] === 'object') {
                var objRef = findRefPathInContent(addToPath(path, key), subKey, o[subKey], id);
                if (objRef.key) {
                    return objRef;
                }
            }
            if (o[subKey] === id || (typeof o[id] === 'string' && o[id].indexOf(id))) {
                return {
                    path: addToPath(path, key + '.' + subKey),
                    key: key,
                };
            }
        }
    }
    return {
        path: addToPath(path, key),
        key: null,
    };
}

exports.getIdFromUrl = getIdFromUrl;
function getIdFromUrl (url) {
    var ret = {
        external: true,
        invalid: false,
        refId: null,
        pathTo: null,
    };
    url = url.toLowerCase();
    if (url.indexOf('https://') !== -1 || url.indexOf('http://') !== -1) {
        url = url.replace(':443', '');
        if (url.indexOf('https://www.nav.no/') === 0 || url.indexOf('http://www.nav.no/') === 0) {
            ret.external = false;
            url = decodeURIComponent(url);
            url = url.replace(/\+/g, '-');
            url = url.replace(/,/g, '');
            url = url.replace(/å/g, 'a');
            url = url.replace(/ø/g, 'o');
            url = url.replace(/æ/g, 'ae');
            if (url.indexOf('?') > -1) {
                var urlSplitOnQuestionmark = url.split('?');
                if (urlSplitOnQuestionmark.length === 2) {
                    url = urlSplitOnQuestionmark[0];
                }
            }
            var cmsKey;
            if (url.indexOf('.cms') === url.length - 4) {
                url = url.replace('.cms', '');
                var urlSplit = url.split('.');
                var cms = urlSplit[urlSplit.length - 1];
                if (isNaN(parseInt(cms))) {
                    urlSplit = url.split('/');
                    cms = urlSplit[urlSplit.length - 1];
                    cmsKey = cms;
                    url = url.replace('/' + cms, '');
                } else {
                    cmsKey = cms;
                    url = url.replace('.' + cms, '');
                }
            }
            if (url.indexOf('/_attachment/') !== -1) {
                var urlSplitOnAttachment = url.split('/_attachment/');
                cmsKey = urlSplitOnAttachment[urlSplitOnAttachment.length - 1];
            }
            var path = url.replace('https://', '/').replace('http://', '/');

            var c;
            if (cmsKey) {
                var hits = contentLib.query({
                    start: 0,
                    count: 10,
                    query: 'x.no-nav-navno.cmsContent.contentKey LIKE "' + cmsKey + '"',
                }).hits;
                if (hits.length === 1) {
                    c = hits[0];
                }
            }
            if (!c) {
                var count = 0;
                var useCount = false;
                while (count < 10 && !c) {
                    var testPath = path;
                    if (!useCount) {
                        useCount = true;
                    } else {
                        testPath += '_' + count;
                        count += 1;
                    }
                    c = contentLib.get({
                        key: testPath,
                    });
                    if (c) {
                        path = testPath;
                    }
                }
            }

            ret.pathTo = path;
            if (c) {
                ret.refId = c._id;
            } else {
                ret.invalid = true;
            }
        }
    }

    return ret;
}

exports.createRefMap = createRefMap;
var refMap = {

};
function createRefMap () {
    var navno = contentLib.get({
        key: '/www.nav.no',
    });
    var contentSite = contentLib.get({
        key: '/content',
    });
    var redirects = contentLib.get({
        key: '/redirects',
    });

    // reset refMap
    refMap = {

    };

    findRefsInElements([navno, contentSite, redirects], refMap);
    log.info(JSON.stringify(refMap, null, 2));
}

function findRefsInElements (elements, refMap) {
    elements.forEach(function (elem) {
        var dataString = JSON.stringify(elem.data);
        var refs = [];
        var match;

        var hrefPtrn = /href=\\"(.*?)\\"/g;
        while ((match = hrefPtrn.exec(dataString)) != null) {
            refs.push(
                match[1]
                    .replace(/\\"/g)
                    .replace('content://', '')
                    .replace('media://download/', '')
                    .replace('image://', '')
            ); // we only care about group 1, not the whole match
        }
        var srcPtrn = /src=\\"(.*?)\\"/g;
        while ((match = srcPtrn.exec(dataString)) != null) {
            refs.push(
                match[1]
                    .replace(/\\"/g)
                    .replace('content://', '')
                    .replace('media://download/', '')
                    .replace('image://', '')
            ); // we only care about group 1, not the whole match
        }

        if (refs.length > 0) {
            // convert url to id if possible
            refs.map(function (ref) {
                var idInfo = getIdFromUrl(ref);
                if (idInfo.external === false && idInfo.invalid === false) {
                    log.info('CONVERTED ' + ref + ' => ' + idInfo.refId);
                    return idInfo.refId;
                }
                return ref;
            });
            refMap[elem._id] = refs;
        }

        var children = contentLib.getChildren({
            key: elem._id,
            count: 10000,
            start: 0,
        }).hits;
        findRefsInElements(children, refMap);
    });
}

exports.isInRefMap = getRefsInRefMap;
function getRefsInRefMap (id) {
    var usedIn = [];
    for (var key in refMap) {
        refMap[key].forEach(function (refId) {
            if (refId === id) {
                usedIn.push(key);
            }
        });
    }
    return usedIn;
}

exports.runInContext = runInContext;
function runInContext (socket, func) {
    contextLib.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        function () {
            func(socket);
        }
    );
}
