var contentLib = require('/lib/xp/content');
var utils = require('/lib/nav-utils');
var tools = require('/lib/tools');
var node = require('/lib/xp/node');
exports.translate = translate;
exports.translateTables = translateTables;


function getRefs(a,b,c,d,e) { return tools.getRefs(a,b,c,d,e); }
function modify(a,b,c,d,e) { return tools.modify(a,b,c,d,e); }

function change_cms2xp_page(content) {
    var children = [];
    if (content.hasChildren) {
        children = contentLib.getChildren({
            key: content._id
        }).hits;
    }
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

var ret = {
    'Artikkel_Ansattportal': function (content) {
        content = changePreface(content);
        content = changeLinks(content);
        content = changeFactPlacement(content);
        content = insertContentTypeMetaTag(content);
        return content;
    },
    'Artikkel_Arena-veiviser': function(content) {
        content = insertContentTypeMetaTag(content);
        return content;
    },
    'Artikkel_Brukerportal': function (content) {
        content = changePreface(content);
        content = changeSocial(content);
        content = changeTilbakemelding(content);
        content = changeNewsSchemas(content);
        content = changeLinks(content);
        content = changeLaws(content);
        content = changeInternational(content);
        content = changeSelfService(content);
        content = changeLanguageVersions(content);
        content = changeFactPlacement(content);
        content = changeHideDate(content);
        content = mapReduceMenuItems(content);
        content = insertContentTypeMetaTag(content);
        content = removeImageSize(content);
        return content;
    },
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
    'Kort_om': function(content) {
        content = changeRates(changeTitle(changeSocial(
            changeTilbakemelding(
                changeNewsSchemas(
                    changeMembership(
                        changeInformation(
                            changeQA(
                                changeInternational(
                                    changeNotifications(
                                        changeAppeals(
                                            changeLaws(
                                                changeSelfService(
                                                    changeLanguageVersions(content)
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )));
        if (content.data.schemas) {
            content = insertMetaTag(content, 'schemas', content.data.schemas);
            delete content.data.schemas;
        }
        content = insertContentTypeMetaTag(content);
        return content
    },
    'cms2xp_page': function (content) {
        change_cms2xp_page(content);
        content = insertContentTypeMetaTag(content);
        return content;
    },
    'nav.nyhet': function (content) {
        content = changeHideDate(content);
        content = changePreface(content);
        content = changeSocial(content);
        content = changeNewsSchemas(content);
        content = changeLinks(content);
        content = changeFactPlacement(content);
        content = changeLanguageVersions(content);
        content = mapReduceMenuItems(content);
        content = insertContentTypeMetaTag(content);
        return content;
    },



}
function def(content) {
    return content;
}

function createNewContent(content) {
    var res = contentLib.create({
        name: content._name,
        contentType: 'no.nav.navno:main-article',
        parentPath: '/sites/www.nav.no/no/test/',
        displayName: content.displayName,
        language: content.language,
        data: content.data,
        x: content.x
    });
    if (res) return contentLib.modify({key: res._id, editor: function (c) {
            c.x = content.x;
            return c;
        }});
    else return content;
}



function shouldTranslate(content) {
    return (content && content.type) ? ret.hasOwnProperty(content.type.replace(app.name + ":", "")) : false;
}
function logBeautify(a,b,c,d,e) { return tools.logBeautify(a,b,c,d,e); }
function deleteOldContent(a,b,c,d,e) { return tools.deleteOldContent(a,b,c,d,e); }
function moveNewContent(a,b,c,d,e) { return tools.moveNewContent(a,b,c,d,e); }

exports.logBeautify = logBeautify;
var repo = node.connect({
    repoId: 'cms-repo',
    branch: 'draft'
});
function translate(content) {

/*    if (shouldTranslate(content)) {

        if (content.type.split(':')[1] === 'cms2xp_page') return content;
        var refs = getRefs(content);
        var newContent;
       // try {
            newContent = createNewContent(content);
       /* } catch (e) {
            log.info("Failed");
            log.info(e);
            logBeautify(content);
            return content;
        }*//*
        deleteOldContent(content, newContent._path);
        refs.forEach(function (value) {

            modify(value, newContent._id, content._id);

        });

        newContent = moveNewContent(newContent, content._path);
        return newContent;
    }*/
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

function warn(property, el) {
    log.info(property + ' missing from ' + JSON.stringify(el));
    return '';
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
    //libs.util.log(sectionIds);
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
function inspectContent(a,b,c,d,e) { return tools.inspectContent(a,b,c,d,e); }
//function shouldTranslateTable(a,b,c,d,e) { return tools.shouldTranslateTable(a,b,c,d,e); }
function getTableElements(a,b,c,d,e) { return tools.getTableElements(a,b,c,d,e); }
function createNewTableContent(a,b,c,d,e) { return tools.createNewTableContent(a,b,c,d,e); }

function translateTables(content) {
    var tableElements = getTableElements(content) || [];
    var ntkElements = getNTKElements(content) || [];
    var newElements = getNewsElements(content) || [];
    var scElements = getSCElements(content) || [];
    var ssElements = getSSElements(content) || [];

    var newContent = createNewTableContent(tableElements, ntkElements, newElements, scElements, content);

    if (newContent === content) return content;
    getRefs(content._id).forEach(function (value) {
        modify(value, newContent._id, content._id);
    });
   deleteOldContent(content, newContent._path);
   newContent = moveNewContent(newContent, content._path);
   return newContent;

}

function getContents(content) {
    var cms = content.x['no-nav-navno'];
    var key = cms.cmsContent ? cms.cmsContent.contentKey : cms.cmsMenu.menuItemKey;
    var c;
    log.info("Key: " + key);
    if (key) {
        c = utils.getContentByCmsKey(key);
        c = c ? c : utils.getContentByMenuKey(key);
        if (c) {
            for (var k in c.data) {
                if (c.data.hasOwnProperty(k) && !content.data[k]) {
                    content.data[k] = c.data[k];
                }
            }
        }
    }
    return content;
}



function changeShortcuts(a,b,c,d,e) { return tools.changeShortcuts(a,b,c,d,e); }
function changeDescription(a,b,c,d,e) { return tools.changeDescription(a,b,c,d,e); }
function join(a,b,c,d,e) { return tools.join(a,b,c,d,e); }
exports.join = join;
exports.changeSidebeskrivelse = changeSidebeskrivelse;
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

exports.shouldTranslateTable = shouldTranslateTable;
function shouldTranslateTable(content) {
    return tableTranslator.hasOwnProperty(content.type.replace(app.name + ':',""))
}

function checkForMenuItems(content) {
    var t = true;
    var done = false;

    return t && done;
}

function varifyTableListContent(a,b,c,d,e) { return tools.varifyTableListContent(a,b,c,d,e); }
function createTableListContent(a,b,c,d,e) { return tools.createTableListContent(a,b,c,d,e); }
exports.doTableListTranslation = doTableListTranslation;
function doTableListTranslation(content) {
    if (varifyTableListContent(content)) {
        var newContent;
        try{
            newContent = createTableListContent(content);
        } catch (e) {
            log.info('Failed table list content');
            log.info(e);
            if (!content.data.hasOwnProperty('heading')) {
                content.data.heading = content.displayName;
                return doTableListTranslation(content);
            }
            return content;
        }
        getRefs(content).forEach(function (value) {
            modify(value, newContent._id, content._id);
        });
        deleteOldContent(content, newContent._path);
        newContent = moveNewContent(newContent, content._path);
        return newContent
    }
    return content;
}


function mapDisplayName(el) {
    if (el) return el.data.title || el.data.heading;
    return 'Ikke funnet'
}
exports.change = tools.change;
exports.changeMenuItem = tools.changeMenuItem;

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

exports.checkTextForRefs = checkTextForRefs;

exports.testNodeLib = testNodeLib;
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

exports.nodeCheck = function (id) {
    log.info(logBeautify(repo.get(id)))
}

exports.testOneNode = function (id) {
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

exports.refresh = function () {

      repo.refresh();

}

exports.trans = function(type) {
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
exports.transSidebeskrivelse = function(id) {
    var r = contentLib.get({key: id});
    if (!r || r.type === toContentType('tavleliste')) return;
    var sidebeskrivelse = r;
    var sideHome = repo.get(sidebeskrivelse.x['no-nav-navno'].cmsContent.contentHome);
    sideHome.data = join(sideHome.data, sidebeskrivelse.data);
    if (!sideHome.data.hasOwnProperty('heading')) sideHome.data.heading = sideHome.displayName;
    sideHome = changeShortcuts(sideHome);
    sideHome = changeDescription(sideHome);
    sideHome = mapReduceMenuItems(sideHome);
    getRefs(sidebeskrivelse).forEach(function (value) {
        modify(value, sideHome._id, sidebeskrivelse._id)
    });
    contentLib.delete({ key: sidebeskrivelse._id});
    repo.modify({
        key: sideHome._id,
        editor: function () {
            sideHome._id = sidebeskrivelse._id;
            sideHome.type = toContentType('tavleliste');
            sideHome.page = {};
            return sideHome;
        }
    });

}