var contentLib = require('/lib/xp/content');
var utils = require('/lib/nav-utils');
var tools = require('/lib/tools');
var node = require('/lib/xp/node');
var R = require('/lib/ramda');

function getRefs(a, b, c, d, e) {
    return tools.getRefs(a, b, c, d, e);
}
function modify(a, b, c, d, e) {
    return tools.modify(a, b, c, d, e);
}
function changePreface(a, b, c, d, e) {
    return tools.changePreface(a, b, c, d, e);
}
function changeLinks(a, b, c, d, e) {
    return tools.changeLinks(a, b, c, d, e);
}
function changeFactPlacement(a, b, c, d, e) {
    return tools.changeFactPlacement(a, b, c, d, e);
}
function insertContentTypeMetaTag(a, b, c, d, e) {
    return tools.insertContentTypeMetaTag(a, b, c, d, e);
}
function changeSocial(a, b, c, d, e) {
    return tools.changeSocial(a, b, c, d, e);
}
function changeTilbakemelding(a, b, c, d, e) {
    return tools.changeTilbakemelding(a, b, c, d, e);
}
function changeNewsSchemas(a, b, c, d, e) {
    return tools.changeNewsSchemas(a, b, c, d, e);
}
function changeLaws(a, b, c, d, e) {
    return tools.changeLaws(a, b, c, d, e);
}
function changeInternational(a, b, c, d, e) {
    return tools.changeInternational(a, b, c, d, e);
}
function changeSelfService(a, b, c, d, e) {
    return tools.changeSelfService(a, b, c, d, e);
}
function changeLanguageVersions(a, b, c, d, e) {
    return tools.changeLanguageVersions(a, b, c, d, e);
}
function changeHideDate(a, b, c, d, e) {
    return tools.changeHideDate(a, b, c, d, e);
}
function mapReduceMenuItems(a, b, c, d, e) {
    return tools.mapReduceMenuItems(a, b, c, d, e);
}
function changeRates(a, b, c, d, e) {
    return tools.changeRates(a, b, c, d, e);
}
function changeMembership(a, b, c, d, e) {
    return tools.changeMembership(a, b, c, d, e);
}
function changeInformation(a, b, c, d, e) {
    return tools.changeInformation(a, b, c, d, e);
}
function changeQA(a, b, c, d, e) {
    return tools.changeQA(a, b, c, d, e);
}
function changeNotifications(a, b, c, d, e) {
    return tools.changeNotifications(a, b, c, d, e);
}
function changeAppeals(a, b, c, d, e) {
    return tools.changeAppeals(a, b, c, d, e);
}
function changeTitle(a, b, c, d, e) {
    return tools.changeTitle(a, b, c, d, e);
}
function insertMetaTag(content, key, value) {
    return tools.insertMetaTag(content, key, value);
}
function removeImageSize(content) {
    if (content.data.imagesize === '') delete content.data.imagesize;
    return content;
}
function compose(functions) {
    var composed = functions.reduce(function(t, func) {
        if (!t) t = func;
        else
            t = R.compose(
                t,
                func
            );
        return t;
    });
    return function(content) {
        return composed(content);
    };
}
var ret = {
    Artikkel_Ansattportal: compose([changePreface, changeLinks, changeFactPlacement, insertContentTypeMetaTag]),
    'Artikkel_Arena-veiviser': compose([insertContentTypeMetaTag]),
    Artikkel_Brukerportal: compose([
        changePreface,
        changeSocial,
        changeTilbakemelding,
        changeNewsSchemas,
        changeLinks,
        changeLaws,
        changeInternational,
        changeSelfService,
        changeLanguageVersions,
        changeFactPlacement,
        changeHideDate,
        mapReduceMenuItems,
        insertContentTypeMetaTag,
        removeImageSize
    ]),
    Artikkel_inspirasjon: function(content) {
        return content;
    },
    Artikkel_njava: function(content) {
        return content;
    },
    Artikkel_Pesys: function(content) {
        return content;
    },
    Artist: function(content) {
        content = changePreface(content);
        content = insertContentTypeMetaTag(content);
        return content;
    },
    Bisys_artikkel: changePreface,
    Bisys_modul: changePreface,
    Bisys_rutine: changePreface,
    Blogg_innlegg: changePreface,
    Kort_om: compose([
        changeRates,
        changeTitle,
        changeNewsSchemas,
        changeMembership,
        changeInformation,
        tools.changeProcedural,
        changeQA,
        changeInternational,
        changeNotifications,
        changeAppeals,
        changeLaws,
        changeSelfService,
        changeLanguageVersions,
        insertContentTypeMetaTag
    ]),
    'nav.nyhet': compose([
        changeHideDate,
        changePreface,
        changeSocial,
        changeNewsSchemas,
        changeLinks,
        changeFactPlacement,
        changeLanguageVersions,
        mapReduceMenuItems,
        insertContentTypeMetaTag
    ]),
    'nav.pressemelding': compose([
        changeHideDate,
        changePreface,
        changeSocial,
        changeNewsSchemas,
        changeLinks,
        changeFactPlacement,
        changeLanguageVersions,
        insertContentTypeMetaTag
    ])
};

module.exports = {
    translate: translate,
    translateTables: translateTables,
    ret: ret,
    logBeutify: logBeautify,
    join: join,
    changeSidebeskrivelse: changeSidebeskrivelse,
    shouldTranslateTable: shouldTranslateTable,
    transcms2xpPages: transcms2xpPage,
    getTemplate: getTemplate,
    doTableListTranslation: doTableListTranslation,
    change: tools.change,
    trans: trans,
    changeMenuItem: tools.changeMenuItem,
    transMainSection: transMainSections,
    tmins: transMinSections,
    nodeCheck: nodeCheck,
    testOneNode: testOneNode,
    refresh: refresh,
    transSidebeskrivelse: transSidebeskrivelse,
    changetavleliste: changetavleliste,
    addTemplateToContent: addTemplateToContent
};

function logBeautify(a, b, c, d, e) {
    return tools.logBeautify(a, b, c, d, e);
}
function deleteOldContent(a, b, c, d, e) {
    return tools.deleteOldContent(a, b, c, d, e);
}
function moveNewContent(a, b, c, d, e) {
    return tools.moveNewContent(a, b, c, d, e);
}

var repo = node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin']
});
function translate(content) {
    content = repo.get(content._id);
    if (!ret[content.type.split(':')[1]]) return content;
    content = ret[content.type.split(':')[1]](content);
    content.type = app.name + ':main-article';
    addTemplateToContent(content, '4b75315f-e500-42d4-81d9-4840a19f286e');

    repo.modify({
        key: content._id,
        editor: function(c) {
            return content;
        }
    });
    return content;
}

function addTemplateToContent(c, templateId) {
    if (!c.components) {
        c.components = {
            type: 'page',
            path: '/'
        };
    }
    if (!c.components.page) {
        c.components.page = {};
    }
    c.components.page.template = templateId;
    return c;
}

var tableTranslator = {
    cms2xp_section: function(content) {
        return content;
    }
};

function translateSectionTypeToContentList(content, contentParam) {
    var CmsSectionKey = utils.getContentParam(content, contentParam);
    if (!CmsSectionKey) {
        return null;
    }
    var section = utils.getContentByMenuKey(CmsSectionKey);
    if (!section) {
        return null;
    }

    // update type on section from cms2xp section to innholdsliste, and remove all non-existing elements in the section contents list
    repo.modify({
        key: section._id,
        editor: translateSectionToContentList
    });

    return section._id;
}

function translateSectionToContentList(section) {
    var sectionContents = [];
    if (section.data.sectionContents) {
        sectionContents = contentLib
            .query({
                start: 0,
                count: 1000,
                filters: {
                    ids: {
                        values: section.data.sectionContents
                    }
                }
            })
            .hits.map(function(el) {
                return el._id;
            });
    }
    section.data = {
        sectionContents: sectionContents
    };
    section.type = toContentType('innholdsliste');
    return section;
}

function verifyPaths() {
    return tools.verifyPaths(arguments);
}
function getTableElements(a, b, c, d, e) {
    return tools.getTableElements(a, b, c, d, e);
}
function createNewTableContent(a, b, c, d, e) {
    return tools.createNewTableContent(a, b, c, d, e);
}

function translateTables(content) {
    var tableElements = getTableElements(content) || [];
    var ntkElementId = translateSectionTypeToContentList(content, 'nicetoknow');
    var newElementId = translateSectionTypeToContentList(content, 'news');
    var scElementId = translateSectionTypeToContentList(content, 'shortcuts');

    return createNewTableContent(tableElements, ntkElementId, newElementId, scElementId, content);
}

function changeShortcuts(a, b, c, d, e) {
    return tools.changeShortcuts(a, b, c, d, e);
}
function changeDescription(a, b, c, d, e) {
    return tools.changeDescription(a, b, c, d, e);
}
function join(a, b, c, d, e) {
    return tools.join(a, b, c, d, e);
}

function changeSidebeskrivelse(content) {
    if (content.type && content.type === 'no.nav.navno:nav.sidebeskrivelse') {
        content = changeShortcuts(content);
        if (verifyPaths(content, 'x', 'no-nav-navno', 'cmsContent', 'contentHome')) {
            var i = contentLib.get({
                key: content.x['no-nav-navno'].cmsContent.contentHome
            });
            if (i) {
                i.data = join(i.data, content.data);
                i = changeDescription(i);
                i = mapReduceMenuItems(i);
                contentLib.delete({
                    key: content._id
                });
                return doTableListTranslation(i);
            }
        } else {
            log.info('Verify failed');
        }
    }
    return content;
}

function shouldTranslateTable(content) {
    return tableTranslator.hasOwnProperty(content.type.replace(app.name + ':', ''));
}

function varifyTableListContent(a, b, c, d, e) {
    return tools.varifyTableListContent(a, b, c, d, e);
}
function createTableListContent(a, b, c, d, e) {
    return tools.createTableListContent(a, b, c, d, e);
}

function doTableListTranslation(content) {
    if (varifyTableListContent(content)) {
        var newContent;
        try {
            newContent = createTableListContent(content);
        } catch (e) {
            log.info('Failed table list content');
            log.info(e);
            return content;
        }
        getRefs(content).forEach(function(value) {
            modify(value, newContent._id, content._id);
        });
        deleteOldContent(content, newContent._path);
        newContent = moveNewContent(newContent, content._path);
        //    moveFromContentSiteToContent(newContent.data.sectionContents, {path: newContent._path, id: newContent._id});
        return newContent;
    }
    return content;
}

function nodeCheck(id) {
    log.info(logBeautify(repo.get(id)));
}

function testOneNode(id) {
    var c = repo.get(id);
    c = ret['nav.nyhet'](c);
    repo.modify({
        key: c._id,
        editor: function() {
            c.type = app.name + ':main-article';
            return c;
        }
    });
    log.info(logBeautify(repo.get(id)));
}

function refresh() {
    repo.refresh();
}

function trans(type) {
    if (!ret[type]) return false;
    else {
        var start = 0;
        var length = 100;
        var ids = [];
        while (length === 100) {
            var r = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':' + type]
            });
            ids = ids.concat(
                r.hits.map(function(el) {
                    return el._id;
                })
            );
            length = r.hits.length;
            start += length;
        }
        var contents = repo.get(ids);
        //log.info(logBeautify(contents));
        contents.forEach(function(value) {
            if (ret[value.type.replace(app.name + ':', '')]) {
                var content = ret[value.type.replace(app.name + ':', '')](value);
                repo.modify({
                    key: content._id,
                    editor: function() {
                        content.type = app.name + ':main-article';
                        return content;
                    }
                });
            } else {
                log.info(logBeautify(value));
            }
        });
    }
}
function toContentType(type) {
    return app.name + ':' + type;
}
function transSidebeskrivelse(indexConfigurations, socket) {
    var start = 0;
    var count = 100;
    var ar = [];
    while (count === 100) {
        var q = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('nav.sidebeskrivelse')]
        });
        count = q.hits.length;
        start += count;
        ar = ar.concat(
            q.hits.map(function(el) {
                return el._id;
            })
        );
    }
    socket.emit('sidebeskrivelsemax', ar.length);
    ar.forEach(function(id, index) {
        socket.emit('sidebeskrivelseval', index + 1);

        var sidebeskrivelse = contentLib.get({ key: id });
        var sideHome = repo.get(sidebeskrivelse.x['no-nav-navno'].cmsContent.contentHome);
        // NOTE: Why? This doesn't do anything
        if (!sideHome) {
            sideHome = utils.getContentByCmsKey(sidebeskrivelse.x['no-nav-navno'].cmsContent.contentKey);
            // log.info(JSON.stringify(sideHome, null, 4));
            return;
        }
        if (!sideHome) return;
        sideHome.data.ingress = sidebeskrivelse.data.description;
        // replace all sidebeskrivelse refs with home refs
        getRefs(sidebeskrivelse).forEach(function(value) {
            modify(value, sideHome._id, sidebeskrivelse._id);
        });
        // delete sidebeskrivelse because all the content is now moved into home
        contentLib.delete({ key: sidebeskrivelse._id });
        // modify home with the new ingress
        repo.modify({
            key: sideHome._id,
            editor: function() {
                return sideHome;
            }
        });
        // NOTE: Why? Some of the sectionContents elements are located in /content and not in /www.nav.no, but is this the correct place to move them?
        // And why do it here and not where home (cms2xp_section => tavleliste, translate.js -> changeSection2TavleListe())?
        // move all elements in the list to be children of home
        moveFromContentSiteToContent(sideHome.data.sectionContents, { path: sideHome._path, id: sideHome._id });
    });
}
var t = true;
function changetavleliste(id) {
    if (!t) return;
    t = false;
    var r = [];
    var correct = repo.get(id)._indexConfig;
    var start = 0;
    var count = 100;
    while (count === 100) {
        var h = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('tavleliste')]
        }).hits;
        count = h.length;
        r = r.concat(h);
        start += count;
    }
    log.info(logBeautify(r));
    r.forEach(function(el) {
        var wrong = repo.get(el._id);
        log.info(logBeautify(wrong));
        wrong._indexConfig = correct;
        addTemplateToContent(wrong, getTemplate('seksjon-tavleseksjon'));
        repo.modify({
            key: wrong._id,
            editor: function() {
                return wrong;
            }
        });
    });
}

function transMainSections(indexConfig, socket) {
    log.info('Translating Mains');
    var start = 0;
    var count = 100;
    var r = [];
    log.info(toContentType('cms2xp_section'));
    while (count === 100) {
        var h = contentLib.query({
            start: start,
            count: count,
            query: 'type = "' + toContentType('cms2xp_section') + '" AND components.page.template = "' + getTemplate('person-seksjonsforside-niva-1') + '"'
        }).hits;
        r = r.concat(h);
        count = h.length;
        start += count;
    }
    socket.emit('mainmax', r.length);
    r.forEach(function(value, index) {
        log.info(value._id);
        socket.emit('mainval', index + 1);

        var content = repo.get(value._id);
        var was = content.type;
        if (was === toContentType('main-article')) return;
        content.data = translateTables(content);
        content._indexConfig = indexConfig;
        content.type = toContentType('oppslagstavle');
        // log.info(logBeautify(content));
        addTemplateToContent(content, getTemplate('seksjon-hovedseksjon'));
        repo.modify({
            key: content._id,
            editor: function() {
                return content;
            }
        });
    });
    //log.info(logBeautify(repo.get('ca45a206-54ee-4907-8fde-51e17ba2b6b8')));
    //log.info(logBeautify(repo.get(r[0]._id)))
    //log.info(logBeautify(r));
}

var tmins = true;

function transMinSections(id, socket) {
    var start = 0;
    var count = 100;
    var r = [];
    while (count === 100) {
        var h = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('cms2xp_section')]
        }).hits;
        r = r.concat(
            h.reduce(function(t, el) {
                if (el.page && el.page.template === getTemplate('person-seksjonsside-niva-2')) t.push(el);
                return t;
            }, [])
        );
        count = h.length;
        start += count;
    }
    if (socket) socket.emit('minmax', r.length);
    var indexParams = id;
    r.forEach(function(value, index) {
        log.info(value._id);
        if (socket) socket.emit('minval', index + 1);
        var content = repo.get(value._id);
        if (content) {
            content.data = translateTables(content);
            content._indexConfig = indexParams;
            content.type = toContentType('oppslagstavle');
            addTemplateToContent(content, getTemplate('seksjon-hovedseksjon'));
            repo.modify({
                key: content._id,
                editor: function() {
                    return content;
                }
            });
            moveFromContentSiteToContent(content.data.tableContents, { path: content._path, id: content._id });
        } else log.info(logBeautify(value));
    });
}
function moveFromContentSiteToContent(elements, contentObj) {
    elements = elements ? (Array.isArray(elements) ? elements : [elements]) : [];
    elements.forEach(function(value) {
        var element = repo.get(value);
        if (element && element._path.split('/').indexOf('www.nav.no') === -1) {
            var done = false;
            var str = '';
            var int = 2;
            while (!done) {
                done = true;
                try {
                    repo.move({
                        source: value,
                        target: contentObj.path + '/' + str
                    });
                } catch (e) {
                    str = element._name + int++;
                    done = false;
                }
            }
        }
    });
}

function transcms2xpPage(indexConfig, socket) {
    // map over articles to move refs from and delete after
    var articles = {};
    // find all cms2xp_pages
    var r = [];
    var start = 0;
    var count = 100;
    while (count === 100) {
        var h = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('cms2xp_page')]
        }).hits;
        r = r.concat(h);
        count = h.length;
        start += count;
    }
    socket.emit('cms2xp_pagemax', r.length);

    r.forEach(function(value, index) {
        socket.emit('cms2xp_pageval', index + 1);

        var cms2xp = repo.get(value._id);
        // try to get content article or move the cms2xp_page to not found
        if (cms2xp && cms2xp.x && cms2xp.x['no-nav-navno'] && cms2xp.x['no-nav-navno'].cmsMenu && cms2xp.x['no-nav-navno'].cmsMenu.content) {
            var article = null;
            try {
                article = repo.get(cms2xp.x['no-nav-navno'].cmsMenu.content);
            } catch (e) {
                log.info('Node not found');
                // repo.move({
                //     source: cms2xp._id,
                //     target: '/content/www.nav.no/not-found/'
                // });
            }

            // check if its possible to convert article to a new navno content-type
            // log.info('****************************************************************************************');
            // log.info(JSON.stringify(cms2xp, null, 4));
            if (article) {
                log.info(stripContentType(article.type));
                if (!ret[stripContentType(article.type)]) {
                    log.info('Article not in ret');
                    log.info(logBeautify(article));
                    return;
                } else {
                    // convert article from old content-type to a new navno content-type (most likely main-article)
                    article = ret[stripContentType(article.type)](article);
                    // log.info(JSON.stringify(article, null, 4));

                    // modify the article and write new data, type and indexConfig to repo
                    repo.modify({
                        key: cms2xp._id,
                        editor: function() {
                            // update type and set correct indexConfig
                            cms2xp.type = toContentType('main-article');
                            cms2xp._indexConfig = indexConfig;
                            // set new template
                            addTemplateToContent(cms2xp, getTemplate('artikkel-hovedartikkel'));
                            // keep menu params
                            var parameters = cms2xp.data.parameters;
                            // take all data from article and add params
                            cms2xp.data = article.data;
                            if (parameters) {
                                cms2xp.data.parameters;
                            }
                            // delete old content ref
                            delete cms2xp.x['no-nav-navno'].cmsMenu.content;
                            return cms2xp;
                        }
                    });

                    if (!articles[article._id]) {
                        articles[article._id] = [];
                    }
                    articles[article._id].push(cms2xp);
                }
            } else {
                log.info('article missing');
            }
        }
    });

    // delete all articles used by cms2xp_pages and update refs
    for (var articleId in articles) {
        var cms2xpPages = articles[articleId];
        // find all references to the article
        var refInfo = tools.getRefInfo(articleId);
        // update with closest cms2xp_page if there are more than one
        refInfo.pathsExtd.forEach(function(ref) {
            // split ref and cms2xp_page paths on / and update ref to point to the cms2xp_page with the most matching path parts
            var cms2xpPage;
            var pathMatches = 0;
            var refPaths = ref.path.split('/');
            cms2xpPages.forEach(function(c) {
                var cms2xpPaths = c._path.split('/');
                var currentCms2xpPagePathMatches = 0;
                // count matching path parts
                for (var i = 0; i < cms2xpPaths.length; i += 1) {
                    if (cms2xpPaths[i] !== refPaths[i]) {
                        break;
                    }
                    currentCms2xpPagePathMatches = i + 1;
                }
                // update cms2xp_page if its a better match then the preceeding cms2xp_pages
                if (currentCms2xpPagePathMatches > pathMatches) {
                    pathMatches = currentCms2xpPagePathMatches;
                    cms2xpPage = c;
                }
            });
            // use the first if there are no matches
            if (!cms2xpPage) {
                cms2xpPage = cms2xpPages[0];
            }
            // update refs from article id to cms2xp_page id in ref
            tools.modify(contentLib.get({ key: ref.id }), articleId, cms2xpPage._id);
        });

        // delete article
        contentLib.delete({ key: articleId });
    }
}

function stripContentType(type) {
    return type.replace(app.name + ':', '');
}

function getTemplate(templateName) {
    var ret = '';
    var r = contentLib.query({
        query: '_name LIKE "' + templateName + '"'
    });
    if (!r.hits[0]) {
        r = contentLib.get({ key: '/www.nav.no/_templates/' + templateName });
    }
    return r.hits[0]._id;
}
