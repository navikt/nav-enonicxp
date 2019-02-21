var contentLib = require('/lib/xp/content');
var utils = require('/lib/nav-utils');
var tools = require('/lib/tools');
var node = require('/lib/xp/node');
var R = require('/lib/ramda');




function getRefs(a,b,c,d,e) { return tools.getRefs(a,b,c,d,e); }
function modify(a,b,c,d,e) { return tools.modify(a,b,c,d,e); }

function change_cms2xp_page(content) {
    var children = content.hasChildren ? contentLib.getChildren({key: content._id}).hits : [];
    var contentKey = utils.getContentParam(content, 'key');
    if (contentKey) {
        var c = utils.getContentByCmsKey(contentKey);
        var newContent = translate(c);
        if (newContent !== c) {
            children.forEach(function (value) {
                contentLib.move({
                    source: value._path,
                    target: newContent._path + '/'
                })
            })
            getRefs(content).forEach(function (value) {
                modify(value, newContent._id, content._id);
            })

            contentLib.delete({
                key: content._id
            });
            newContent = moveNewContent(newContent, content._path);
            return newContent;
        }
        return c;
    }
    return content;
}
function changePreface(a,b,c,d,e) { return tools.changePreface(a,b,c,d,e); }
function changeLinks(a,b,c,d,e) { return tools.changeLinks(a,b,c,d,e); }
function changeFactPlacement(a,b,c,d,e) { return tools.changeFactPlacement(a,b,c,d,e); }
function insertContentTypeMetaTag(a,b,c,d,e) { return tools.insertContentTypeMetaTag(a,b,c,d,e); }
function changeSocial(a,b,c,d,e) { return tools.changeSocial(a,b,c,d,e); }
function changeTilbakemelding(a,b,c,d,e) { return tools.changeTilbakemelding(a,b,c,d,e); }
function changeNewsSchemas(a,b,c,d,e) { return tools.changeNewsSchemas(a,b,c,d,e); }
function changeLaws(a,b,c,d,e) { return tools.changeLaws(a,b,c,d,e); }
function changeInternational(a,b,c,d,e) { return tools.changeInternational(a,b,c,d,e); }
function changeSelfService(a,b,c,d,e) { return tools.changeSelfService(a,b,c,d,e); }
function changeLanguageVersions(a,b,c,d,e) { return tools.changeLanguageVersions(a,b,c,d,e); }
function changeHideDate(a,b,c,d,e) { return tools.changeHideDate(a,b,c,d,e); }
function mapReduceMenuItems(a,b,c,d,e) { return tools.mapReduceMenuItems(a,b,c,d,e); }
function changeRates(a,b,c,d,e) { return tools.changeRates(a,b,c,d,e); }
function changeMembership(a,b,c,d,e) { return tools.changeMembership(a,b,c,d,e); }
function changeInformation(a,b,c,d,e) { return tools.changeInformation(a,b,c,d,e); }
function changeQA(a,b,c,d,e) { return tools.changeQA(a,b,c,d,e); }
function changeNotifications(a,b,c,d,e) { return tools.changeNotifications(a,b,c,d,e); }
function changeAppeals(a,b,c,d,e) { return tools.changeAppeals(a,b,c,d,e); }
function changeTitle(a,b,c,d,e) { return tools.changeTitle(a,b,c,d,e); }
function insertMetaTag(content, key, value) { return tools.insertMetaTag(content, key, value); }
function removeImageSize(content) {
    if (content.data.imagesize === '') delete content.data.imagesize;
    return content;
}
function compose(functions) {
    var composed = functions.reduce(function(t, func) {
      if (!t) t = func;
      else t = R.compose(t, func);
      return t;
    });
    return function(content) {
        return composed(content);
    }
}
var ret = {
    'Artikkel_Ansattportal': compose([changePreface, changeLinks, changeFactPlacement, insertContentTypeMetaTag]),
    'Artikkel_Arena-veiviser': compose([insertContentTypeMetaTag]),
    'Artikkel_Brukerportal': compose([
        changePreface,
        changeSocial,
        changeTilbakemelding,
        changeNewsSchemas,
        changeLinks,
        changeLaws, changeInternational, changeSelfService,
        changeLanguageVersions,
        changeFactPlacement,
        changeHideDate,
        mapReduceMenuItems,
        insertContentTypeMetaTag,
        removeImageSize
    ]),
    'Artikkel_inspirasjon': function (content) {
        return content;
    },
    'Artikkel_njava': function (content) {
        return content;
    },
    'Artikkel_Pesys': function (content) {
        return content;
    },
    'Artist': function (content) {
        content = changePreface(content);
        content = insertContentTypeMetaTag(content);
        return content;
    },
    'Bisys_artikkel': changePreface,
    'Bisys_modul': changePreface,
    'Bisys_rutine': changePreface,
    'Blogg_innlegg': changePreface,
    'Kort_om': compose([
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
    'cms2xp_page': function (content) {
        change_cms2xp_page(content);
        content = insertContentTypeMetaTag(content);
        return content;
    },
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
}


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
    checkTextForRefs: checkTextForRefs,
    transMainSection: transMainSections,
    tmins: transMinSections,
    testNodeLib: testNodeLib,
    nodeCheck: nodeCheck,
    testOneNode: testOneNode,
    refresh: refresh,
    transSidebeskrivelse: transSidebeskrivelse,
    changetavleliste: changetavleliste
}

function logBeautify(a,b,c,d,e) { return tools.logBeautify(a,b,c,d,e); }
function deleteOldContent(a,b,c,d,e) { return tools.deleteOldContent(a,b,c,d,e); }
function moveNewContent(a,b,c,d,e) { return tools.moveNewContent(a,b,c,d,e); }


var repo = node.connect({
    repoId: 'cms-repo',
    branch: 'draft',
    principals: ['role:system.admin']
});
function translate(content) {

    content = repo.get(content._id);
    if (!ret[content.type.split(':')[1]]) return content;
    content = ret[content.type.split(':')[1]](content);
    content.type = app.name + ':main-article';
    content.page = {
        template: '4b75315f-e500-42d4-81d9-4840a19f286e'
    }

    repo.modify({
        key: content._id,
        editor: function (c) {
            return content
        }
    })
    return content;
}





var tableTranslator = {
    'cms2xp_section' : function (content) {
        return content;
    }
}








function getNTKElements(content) {
    var nicetoknow = utils.getContentParam(content, 'nicetoknow');
    if (!nicetoknow) {
        return null;
    }
    var section = utils.getContentByMenuKey(nicetoknow);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return null;
    }
    var queryResult = contentLib.query({
        start: 0,
        count: 5,
        filters: {
            ids: {
                values: sectionIds
            }
        }
    });
    return queryResult.hits;
}

function getNewsElements(content) {
        var news = utils.getContentParam(content, 'news');
        if (!news) {
            return null;
        }
        var section = utils.getContentByMenuKey(news);
        var sectionIds = section && section.data.sectionContents;
        if (!sectionIds) {
            return null;
        }

        var queryResult = contentLib.query({
            start: 0,
            count: 10,
            filters: {
                ids: {
                    values: sectionIds
                }
            },
            contentTypes: [
                app.name + ':nav.snarvei',
                app.name + ':nav.nyhet',
                app.name + ':nav.pressemelding',
                app.name + ':Artikkel_Brukerportal'
            ]
        });

        // Each news item needs to format the publish.from date in two separate ways, based on language.
        // In XSLT the time.xsl STK function is used, it will only show Norwegian format for Norwegians, and fallback to the English format for all other locales. That is pretty simple logic.


        return queryResult.hits;
}

function getSSElements(content) {
    var shortcuts = utils.getContentParam(content, 'selfservice');
    if (!shortcuts) {
        return null;
    }
    var section = utils.getContentByMenuKey(shortcuts);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return null;
    }

    var queryResult = contentLib.query({
        start: 0,
        count: 5,
        filters: {
            ids: {
                values: sectionIds
            }
        }
    });
    return queryResult.hits;
}

function getSCElements(content) {
    var shortcuts = utils.getContentParam(content, 'shortcuts');
    if (!shortcuts) {
        return null;
    }
    var section = utils.getContentByMenuKey(shortcuts);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return null;
    }

    var queryResult = contentLib.query({
        start: 0,
        count: 5,
        filters: {
            ids: {
                values: sectionIds
            }
        }
    });
    return queryResult.hits;
}

function verifyPaths() { return tools.verifyPaths(arguments); }
function getTableElements(a,b,c,d,e) { return tools.getTableElements(a,b,c,d,e); }
function createNewTableContent(a,b,c,d,e) { return tools.createNewTableContent(a,b,c,d,e); }

function translateTables(content) {
    var tableElements = getTableElements(content) || [];
    var ntkElements = getNTKElements(content) || [];
    var newElements = getNewsElements(content) || [];
    var scElements = getSCElements(content) || [];

    return createNewTableContent(tableElements, ntkElements, newElements, scElements, content);
}



function changeShortcuts(a,b,c,d,e) { return tools.changeShortcuts(a,b,c,d,e); }
function changeDescription(a,b,c,d,e) { return tools.changeDescription(a,b,c,d,e); }
function join(a,b,c,d,e) { return tools.join(a,b,c,d,e); }

function changeSidebeskrivelse(content) {
    if (content.type && content.type === 'no.nav.navno:nav.sidebeskrivelse') {
        content = changeShortcuts(content);
        if (verifyPaths(content,'x','no-nav-navno','cmsContent','contentHome')) {
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
        }

        else {
            log.info('Verify failed');
        }
    }
    return content;
}


function shouldTranslateTable(content) {
    return tableTranslator.hasOwnProperty(content.type.replace(app.name + ':',""))
}



function varifyTableListContent(a,b,c,d,e) { return tools.varifyTableListContent(a,b,c,d,e); }
function createTableListContent(a,b,c,d,e) { return tools.createTableListContent(a,b,c,d,e); }

function doTableListTranslation(content) {
    if (varifyTableListContent(content)) {
        var newContent;
        try{
            newContent = createTableListContent(content);
        } catch (e) {
            log.info('Failed table list content');
            log.info(e);
            return content;
        }
        getRefs(content).forEach(function (value) {
            modify(value, newContent._id, content._id);
        });
        deleteOldContent(content, newContent._path);
        newContent = moveNewContent(newContent, content._path);
    //    moveFromContentSiteToContent(newContent.data.sectionContents, {path: newContent._path, id: newContent._id});
        return newContent
    }
    return content;
}




function checkTextForRefs(content) {
    if (!content) return [];
    var start = 0;
    var length = 100;
    var ret = [];
    var query;
    while (length === 100) {
        query = contentLib.query({
            start: start,
            length: length,
            query: "fulltext('data.text', 'href=\\\"content://" + content._id + "', 'OR')"
        });
       // log.info(logBeautify(query.hits));
        ret = ret.concat(query.hits);
        length = query.hits.length;
        start += length;
    }
    return ret.map(function (el) {
        return el._id
    });
}




function testNodeLib() {

    var qres = contentLib.query({
        contentTypes: ['nav.nyhet']
    }).hits;
    qres.forEach(function (value) {
        var content = repo.get(value._id);
        translate(content);
    })

    //content = ret[content.type.replace(app.name + ':','')](content);
    repo.modify({
        key: content._id,
        editor: function(c) {
            content.type = app.name + ':main-article';
            return content;
        }
    })
}

function nodeCheck(id) {
    log.info(logBeautify(repo.get(id)))
}

function testOneNode(id) {
    var c = repo.get(id);
    c = ret['nav.nyhet'](c);
    repo.modify({
        key: c._id,
        editor: function () {
            c.type = app.name + ':main-article'
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
             ids = ids.concat(r.hits.map(function (el) {
                 return el._id
             }));
            length = r.hits.length;
            start += length;
        }
        var contents = repo.get(ids);
        //log.info(logBeautify(contents));
        contents.forEach(function (value) {
            if (ret[value.type.replace(app.name + ':','')]) {
                var content = ret[value.type.replace(app.name + ':', '')](value);
                repo.modify({
                    key: content._id,
                    editor: function () {
                        content.type = app.name + ':main-article';
                        return content
                    }
                })
            }
            else {
                log.info(logBeautify(value));
            }
        })
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
        ar = ar.concat(q.hits.map(function (el) {
            return el._id
        }));
    }
    if (socket) socket.emit('sidebeskrivelsemax', ar.length);
    ar.forEach(function (id, index) {
        if (socket) socket.emit('sidebeskrivelseval', index +1);
        var r = contentLib.get({key: id});
        if (!r || r.type === toContentType('tavleliste')) return;
        var sidebeskrivelse = r;
        var sideHome = repo.get(sidebeskrivelse.x['no-nav-navno'].cmsContent.contentHome);
        if (!sideHome) {
            sideHome = utils.getContentByCmsKey(sidebeskrivelse.x['no-nav-navno'].cmsContent.contentKey);
            log.info(JSON.stringify(sideHome, null, 4));
            return;
        }
        if (!sideHome) return;
        sideHome.data = join(sideHome.data, sidebeskrivelse.data);
        sideHome = changeShortcuts(sideHome);
        sideHome = changeDescription(sideHome);
        delete sideHome.data.heading;
        sideHome = mapReduceMenuItems(sideHome);
        sideHome = insertMetaTag(sideHome, 'content', 'nav.sidebeskrivelse');
        getRefs(sidebeskrivelse).forEach(function (value) {
            modify(value, sideHome._id, sidebeskrivelse._id)
        });
        contentLib.delete({ key: sidebeskrivelse._id});
        repo.modify({
            key: sideHome._id,
            editor: function () {
                sideHome._id = sidebeskrivelse._id;
                sideHome.type = toContentType('tavleliste');
                if (!sideHome.page) sideHome.page = {};
                sideHome.page.template = getTemplate('seksjon-tavleseksjon');
                sideHome._indexConfig = indexConfigurations;
                return sideHome;
            }
        });
        moveFromContentSiteToContent(sideHome.data.sectionContents, {path: sideHome._path, id: sideHome._id});
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
    r.forEach(function (el) {
        var wrong = repo.get(el._id);
        log.info(logBeautify(wrong));
        wrong._indexConfig = correct;
        if(!wrong.page) wrong.page = {};
        wrong.page.template = getTemplate('seksjon-tavleseksjon');

        repo.modify({
            key: wrong._id,
            editor: function () {
                return wrong;
            }
        })
    })

}

function transMainSections(id, socket) {
    log.info('Translating Mains');
    var start = 0;
    var count = 100;
    var r = [];
    while (count === 100) {
        var h = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('cms2xp_section')],
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'page.template',
                            values: [getTemplate("person-seksjonsforside-niva-1")]
                        }
                    }
                }
            }
        }).hits;
        r = r.concat(h);
        count = h.length;
        start += count;
    }
    var indexParams = id;
    if (socket) socket.emit('mainmax', r.length);
    r.forEach(function (value, index) {
        if (socket) socket.emit('mainval', index +1);

        var content = repo.get(value._id);
        var was = content.type;
        if (was === toContentType('main-article')) return;
        content.data = translateTables(content);
        content._indexConfig = indexParams;
        content.type = toContentType('oppslagstavle');
       // log.info(logBeautify(content));
        if (!content.page) content.page = {};
        content.page.template = getTemplate('seksjon-hovedseksjon');
        repo.modify({
            key: content._id,
            editor: function () {
                return content;
            }
        });
    })
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
        r = r.concat(h.reduce(function(t, el){
            if (el.page && el.page.template === getTemplate('person-seksjonsside-niva-2')) t.push(el);
            return t;
        },[]));
        count = h.length;
        start += count;
    }
    if (socket) socket.emit('minmax', r.length);
    var indexParams = id;
    r.forEach(function (value, index) {
        if (socket) socket.emit('minval', index +1);
        var content = repo.get(value._id);
        if (content) {
            content.data = translateTables(content);
            content._indexConfig = indexParams;
            content.type = toContentType('oppslagstavle');
            if (!content.page) content.page = {};
            content.page.template = getTemplate('seksjon-hovedseksjon');
            repo.modify({
                key: content._id,
                editor: function () {
                    return content;
                }
            });
            moveFromContentSiteToContent(content.data.tableContents, { path: content._path, id: content._id });
        }
        else log.info(logBeautify(value));
    })


}
function moveFromContentSiteToContent(elements, contentObj) {
    elements = elements ? Array.isArray(elements) ? elements : [elements] : [];
    elements.forEach(function (value) {
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
    })
}

function transcms2xpPage(id, socket) {

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
    if (socket) socket.emit('cms2xp_pagemax', r.length);
    r.forEach(function (value, index) {
        if (socket) socket.emit('cms2xp_pageval', index + 1);
        var cms2xp = repo.get(value._id);
        if (cms2xp && cms2xp.hasOwnProperty('x') && cms2xp.x.hasOwnProperty('no-nav-navno') && cms2xp.x['no-nav-navno'].hasOwnProperty('cmsMenu') && cms2xp.x['no-nav-navno'].cmsMenu.hasOwnProperty('content')) {
           var article = null;
            try {
                article = repo.get(cms2xp.x['no-nav-navno'].cmsMenu.content);
            } catch (e) {
                log.info('Node not found');
                repo.move({
                    source: cms2xp._id,
                    target: '/content/www.nav.no/not-found/'
                })
            }
            if (article && !ret[stripContentType(article.type)]) {
                log.info('Article not in ret');
                log.info(logBeautify(article));
            }
            else {
                if (article) {
                    if (article.x && article.x['no-nav-navno'] && article.x['no-nav-navno'].cmsStatus && article.x['no-nav-navno'].cmsStatus.status !== 'approved') {
                        log.info('Delete article ' + article.displayName);
                        log.info('Delete cms2xp ' + cms2xp.displayName);
                        contentLib.delete({ key: cms2xp._id});
                        contentLib.delete({ key: article._id});
                        return;
                    }
                    var originalArticlePath = article._path;
                    if (article&&article.hasOwnProperty('x')&&article.x.hasOwnProperty('no-nav-navno')&&article.x['no-nav-navno'].hasOwnProperty('cmsContent')&&article.x['no-nav-navno'].cmsContent.hasOwnProperty('contentHome')) {
                        var p = repo.get(article.x['no-nav-navno'].cmsContent.contentHome);
                        if (p) {
                            var path = p._path;
                            log.info('Path:' + path);
                            originalArticlePath = path.split("/").slice(0, -1).join("/") + '/';
                            if (path.indexOf('relatert-informasjon') !== -1) {
                                originalArticlePath = cms2xp._path.split('/').slice(0,-1).join('/') + '/';
                            }
                        }
                        else {
                            log.info(JSON.stringify(article, null, 4));
                            log.info('Missing shit')
                        }
                    }
                    else if (article._name === cms2xp._name || article._path.split('/').indexOf('relatert-informasjon') !== -1) {
                        originalArticlePath = cms2xp._path.split('/').slice(0,-1).join('/') + '/';
                    }
                    repo.move({
                        source: article._id,
                        target: '/content/www.nav.no/tmp/'
                    });
                    article = repo.get(article._id);
                    var cms2xpchildren = repo.findChildren({
                        start: 0,
                        count: 10000,
                        parentKey: cms2xp._id
                    }).hits;
                    cms2xpchildren.forEach(function (value2) {
                        if (value2.id !== article._id) {
                            try {
                                repo.move({
                                    source: value2.id,
                                    target: article._path + '/'
                                })
                            } catch (e) {
                                log.info("Error:");
                                log.info(logBeautify(repo.get(value2.id)));
                            }

                        }
                    });



                    /**
                     * I have my article from a cms2xp_page
                     * I have have moved the children from the cms2xp_page to the actual article
                     * All refs points to the article
                     *
                     *
                     */

                     repo.delete(cms2xp._id);
                    try {
                        repo.move({
                            source: article._id,
                            target: originalArticlePath
                        });
                    } catch (e) {
                        log.info("Deleting: " + cms2xp._path);
                        log.info('Watch: ' + originalArticlePath.split('/').slice(0,-2).join('/')+'/');
                        repo.move({
                            source: article._id,
                            target: originalArticlePath.split('/').slice(0,-2).join("/")+'/'
                        })
                    }
                    article = repo.get(article._id);
                     article = ret[stripContentType(article.type)](article);



                     repo.modify({
                         key: article._id,
                         editor: function () {
                             article.type = toContentType('main-article');
                             article._indexConfig = id;
                             if (!article.page) article.page = {};
                             article.page.template = getTemplate('artikkel-hovedartikkel');
                             return article
                         }
                     });

                }
            }
        }
    })
}

function stripContentType(type) {
    return type.replace(app.name + ':', "")
}



function getTemplate(templateName) {
    var ret = '';
    var r = contentLib.query({
        query: '_name LIKE "' + templateName +'"'
    });
    if (!r.hits[0]) {
        r = contentLib.get({key: '/www.nav.no/_templates/' + templateName})
    }
    return r.hits[0]._id
}
