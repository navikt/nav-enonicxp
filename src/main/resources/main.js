/*var taskLib = require('/lib/xp/task');
var contextLib = require('/lib/xp/context');

var page = require('/migration/page/page');
var deleteStep = require('/migration/steps/delete-content');
var moveStep = require('/migration/steps/move-content');
//var notinuseStep = require('/migration/steps/list-notinuse');


exports.get = function (req) {
    if (req.path.endsWith(app.name)) {
        return page.get(req);
    } else if (req.path.endsWith(app.name + '/status')) {
        return getTaskStatus(req);
    }

    return {
        status: 404,
        body: '<h3>Page not found</h3>',
        contentType: 'text/html'
    }
};

exports.post = function (req) {
    var action = req.params.action || '';
    var result = {ok: false, message: 'Task not found: "' + action + '"'};

    var taskId;
    if (action === 'deleteContent') {
        taskId = async('Delete Content', deleteStep.execute);

    //} else if (action === 'listNotinuse') {
    //    taskId = async('List NotInUse', notinuseStep.execute);

    } else if (action === 'moveContent') {
        taskId = async('Move Content', moveStep.execute);
    }

    if (taskId) {
        result = {ok: true, id: taskId};
    }

    return {
        body: result,
        contentType: 'application/json'
    }
};

function async(name, callback) {
    var currentCtx = contextLib.get();

    return taskLib.submit({
        description: 'Migration task [' + name + ']',
        task: function () {
            contextLib.run(currentCtx, callback);
            log.info('Migration task [' + name + '] completed.');
        }
    });
}

function getTaskStatus(req) {
    var id = req.params.id || '';
    var taskInfo = taskLib.get(id);
    if (!taskInfo) {
        return {
            body: {
                done: true,
                result: 'Task not found'
            },
            contentType: 'application/json'
        }
    }

    return {
        body: {
            done: taskInfo.state === 'FINISHED',
            result: taskInfo.progress.info
        },
        contentType: 'application/json'
    }
}

*/
var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var trans = require('./site/lib/contentTranslator');
var contentLib = require('/lib/xp/content');
var nodeLib = require('/lib/xp/node');
var repoLib = require('/lib/xp/repo');
var taskLib = require('/lib/xp/task');
var event = require('/lib/xp/event');
var redirects = {};

exports.redirects = redirects;


var repo = nodeLib.connect({
    repoId: 'cms-repo',
    branch: 'draft',
    principals: ['role:system.admin']
});

/*event.listener({
    type: '*',
    callback: function (res) {
        if (res.type === 'node.renamed' && res.data.nodes.length === 1 && !res.data.nodes[0].path.split("/").pop().startsWith("__unnamed__")) {
            makeMagic(res.data.nodes[0].id)
        }
        else if (res.type === 'node.moved'){
            makeMagic(res.data.nodes[0].id)
        }
    }
});*/

function makeMagic(id) {

    var p = repo.get(id);
    if (!p) {
        log.info(id);
        return
    }
    var path = p._path;
    var parents = path.split("/");
    //while (parents && parents[0] !== 'sites') parents = parents.slice(1);
    parents.pop();
    while (parents.length > 2) {
        var n = repo.get(parents.join("/"));
        if (n && n.type === toContentType('magic-folder')) {
            path = path.replace(n._path, n._path.split("/").slice(0,-1).join("/"));
        }
        parents.pop();
    }
    var url = "/admin/portal/preview/draft" + path.replace("/content", "");
    var redirect = "/admin/portal/preview/draft" + p._path.replace("/content","");
    redirects[url] = redirect;

}

exports.get = function(req) {
    log.info(trans.logBeautify(req));
  //  trans.logBeautify(repo.get("3c35cd57-462b-4e52-9d5d-a63bd159562b"));
 //   createTemplates();
    createMocks();
  //  var message = 'all done'
    var message = translateContents();
    deleteMocks();
   // changeSeksjon(); noen endringer
  //  gatherRedirects();
   // log.info(moveRedirects());
   // log.info(getUrlRedirectFolder())

    return {
        body: thymeleaf.render(resolve('./translation/translation.html'),{
            message: message,
            styles: portal.assetUrl({path: 'nav-responsive.css'})
        })
    }
};
function deleteMocks() {
    contentLib.delete({
        key: '/sites/www.nav.no/no/main-article'
    });
    contentLib.delete({
        key: '/sites/www.nav.no/no/oppslagstavle'
    });
    contentLib.delete({
        key: '/sites/www.nav.no/no/tavleliste'
    });
}
function createMocks() {
    if (!contentLib.get({ key: '/sites/www.nav.no/no/main-article'})) {
        contentLib.create({
            name: 'main-article',
            contentType: toContentType('main-article'),
            parentPath: '/sites/www.nav.no/no/',
            data: {
                heading: 'm',
                ingress: 'm',
                text: 'm'
            }
        })
        contentLib.create({
            name: 'oppslagstavle',
            contentType: toContentType('oppslagstavle'),
            parentPath: '/sites/www.nav.no/no/',
            data: {
                heading: 'm'
            }
        })
        contentLib.create({
            name: 'tavleliste',
            contentType: toContentType('tavleliste'),
            parentPath: '/sites/www.nav.no/no/',
            data: {
                heading: 'm',
                ingress: 'm'
            }
        })
    }
}
function createTemplates() {
    var m = {
        "_name": "artikkel-hovedartikkel",
        "_path": "/sites/www.nav.no/_templates/artikkel-hovedartikkel",
        "creator": "user:system:su",
        "modifier": "user:system:su",
        "createdTime": "2018-03-22T09:48:36.420Z",
        "modifiedTime": "2018-03-22T09:49:48.339Z",
        "owner": "user:system:su",
        "type": "portal:page-template",
        "displayName": "Artikkel Hovedartikkel",
        "hasChildren": false,
        "valid": true,
        "data": {
            "supports": "no.nav.navno:main-article"
        },
        "x": {
            "no-nav-navno": {
                "menu-item": {
                    "menuItem": false,
                    "newWindow": false
                },
                "cmsContent": {},
                "cmsMenu": {}
            }
        },
        "page": {
            "controller": "no.nav.navno:page-nav",
            "config": {},
            "regions": {
                "region-center": {
                    "components": [
                        {
                            "name": "main-article",
                            "path": "region-center/0",
                            "type": "part",
                            "descriptor": "no.nav.navno:main-article",
                            "config": {}
                        }
                    ],
                    "name": "region-center"
                },
                "region-east": {
                    "components": [
                        {
                            "name": "main-article-linked-list",
                            "path": "region-east/0",
                            "type": "part",
                            "descriptor": "no.nav.navno:main-article-linked-list",
                            "config": {}
                        },
                        {
                            "name": "main-article-related-content",
                            "path": "region-east/1",
                            "type": "part",
                            "descriptor": "no.nav.navno:main-article-related-content",
                            "config": {}
                        }
                    ],
                    "name": "region-east"
                },
                "region-north": {
                    "components": [],
                    "name": "region-north"
                },
                "region-south": {
                    "components": [],
                    "name": "region-south"
                },
                "region-west": {
                    "components": [],
                    "name": "region-west"
                },
                "scripts-region": {
                    "components": [],
                    "name": "scripts-region"
                }
            }
        },
        "attachments": {},
        "publish": {}
    }
    var o = {
        "_name": "seksjon-hovedseksjon",
        "_path": "/sites/www.nav.no/_templates/seksjon-hovedseksjon",
        "creator": "user:system:su",
        "modifier": "user:system:su",
        "createdTime": "2018-03-22T09:50:15.621Z",
        "modifiedTime": "2018-03-22T09:51:04.309Z",
        "owner": "user:system:su",
        "type": "portal:page-template",
        "displayName": "Seksjon hovedseksjon",
        "hasChildren": false,
        "valid": true,
        "data": {
            "supports": "no.nav.navno:oppslagstavle"
        },
        "x": {
            "no-nav-navno": {
                "menu-item": {
                    "menuItem": false,
                    "newWindow": false
                },
                "cmsContent": {},
                "cmsMenu": {}
            }
        },
        "page": {
            "controller": "no.nav.navno:page-nav",
            "config": {},
            "regions": {
                "region-center": {
                    "components": [
                        {
                            "name": "Oppslagstavle",
                            "path": "region-center/0",
                            "type": "part",
                            "descriptor": "no.nav.navno:oppslagstavle",
                            "config": {}
                        }
                    ],
                    "name": "region-center"
                },
                "region-east": {
                    "components": [],
                    "name": "region-east"
                },
                "region-north": {
                    "components": [
                        {
                            "name": "heronighanddaybanner",
                            "path": "region-north/0",
                            "type": "part",
                            "descriptor": "no.nav.navno:heronighanddaybanner",
                            "config": {}
                        }
                    ],
                    "name": "region-north"
                },
                "region-south": {
                    "components": [],
                    "name": "region-south"
                },
                "region-west": {
                    "components": [],
                    "name": "region-west"
                },
                "scripts-region": {
                    "components": [],
                    "name": "scripts-region"
                }
            }
        },
        "attachments": {},
        "publish": {}
    }
    var t = {
        "_name": "seksjon-tavleseksjon",
        "_path": "/sites/www.nav.no/_templates/seksjon-tavleseksjon",
        "creator": "user:system:su",
        "modifier": "user:system:su",
        "createdTime": "2018-03-22T09:51:17.849Z",
        "modifiedTime": "2018-03-22T09:52:31.847Z",
        "owner": "user:system:su",
        "type": "portal:page-template",
        "displayName": "Seksjon Tavleseksjon",
        "hasChildren": false,
        "valid": true,
        "data": {
            "supports": "no.nav.navno:tavleliste"
        },
        "x": {
            "no-nav-navno": {
                "menu-item": {
                    "menuItem": false,
                    "newWindow": false
                },
                "cmsContent": {},
                "cmsMenu": {}
            }
        },
        "page": {
            "controller": "no.nav.navno:page-nav",
            "config": {},
            "regions": {
                "region-center": {
                    "components": [
                        {
                            "name": "tavleliste",
                            "path": "region-center/0",
                            "type": "part",
                            "descriptor": "no.nav.navno:tavleliste",
                            "config": {}
                        }
                    ],
                    "name": "region-center"
                },
                "region-east": {
                    "components": [
                        {
                            "name": "tavleliste-relatert-innhold",
                            "path": "region-east/0",
                            "type": "part",
                            "descriptor": "no.nav.navno:tavleliste-relatert-innhold",
                            "config": {}
                        }
                    ],
                    "name": "region-east"
                },
                "region-north": {
                    "components": [],
                    "name": "region-north"
                },
                "region-south": {
                    "components": [],
                    "name": "region-south"
                },
                "region-west": {
                    "components": [],
                    "name": "region-west"
                },
                "scripts-region": {
                    "components": [],
                    "name": "scripts-region"
                }
            }
        },
        "attachments": {},
        "publish": {}
    };
    if (!repo.get(m._path)) {


        var mid = contentLib.create({
            displayName: 'Artikkel Hovedartikkel',
            data: {
                supports: toContentType('main-article')
            },
            contentType: 'portal:page-template',
            parentPath: '/sites/www.nav.no/_templates/',
            "page": {
                "controller": "no.nav.navno:page-nav",
                "config": {},
                "regions": {
                    "region-center": {
                        "components": [
                            {
                                "name": "main-article",
                                "path": "region-center/0",
                                "type": "part",
                                "descriptor": "no.nav.navno:main-article",
                                "config": {}
                            }
                        ],
                        "name": "region-center"
                    },
                    "region-east": {
                        "components": [
                            {
                                "name": "main-article-linked-list",
                                "path": "region-east/0",
                                "type": "part",
                                "descriptor": "no.nav.navno:main-article-linked-list",
                                "config": {}
                            },
                            {
                                "name": "main-article-related-content",
                                "path": "region-east/1",
                                "type": "part",
                                "descriptor": "no.nav.navno:main-article-related-content",
                                "config": {}
                            }
                        ],
                        "name": "region-east"
                    },
                    "region-north": {
                        "components": [],
                        "name": "region-north"
                    },
                    "region-south": {
                        "components": [],
                        "name": "region-south"
                    },
                    "region-west": {
                        "components": [],
                        "name": "region-west"
                    },
                    "scripts-region": {
                        "components": [],
                        "name": "scripts-region"
                    }
                }
            }
        })._id;
        var oid = contentLib.create({
            displayName: 'Seksjon Hovedseksjon',
            data: {
                supports: toContentType('oppslagstavle')
            },
            contentType: 'portal:page-template',
            parentPath: '/sites/www.nav.no/_templates/',
            "page": {
                "controller": "no.nav.navno:page-nav",
                "config": {},
                "regions": {
                    "region-center": {
                        "components": [
                            {
                                "name": "Oppslagstavle",
                                "path": "region-center/0",
                                "type": "part",
                                "descriptor": "no.nav.navno:oppslagstavle",
                                "config": {}
                            }
                        ],
                        "name": "region-center"
                    },
                    "region-east": {
                        "components": [],
                        "name": "region-east"
                    },
                    "region-north": {
                        "components": [
                            {
                                "name": "heronighanddaybanner",
                                "path": "region-north/0",
                                "type": "part",
                                "descriptor": "no.nav.navno:heronighanddaybanner",
                                "config": {}
                            }
                        ],
                        "name": "region-north"
                    },
                    "region-south": {
                        "components": [],
                        "name": "region-south"
                    },
                    "region-west": {
                        "components": [],
                        "name": "region-west"
                    },
                    "scripts-region": {
                        "components": [],
                        "name": "scripts-region"
                    }
                }
            }
        })._id;
        var tid = contentLib.create({
            displayName: 'Seksjon Tavleseksjon',
            data: {
                supports: toContentType('tavleliste')
            },
            contentType: 'portal:page-template',
            parentPath: '/sites/www.nav.no/_templates/',
            "page": {
                "controller": "no.nav.navno:page-nav",
                "config": {},
                "regions": {
                    "region-center": {
                        "components": [
                            {
                                "name": "tavleliste",
                                "path": "region-center/0",
                                "type": "part",
                                "descriptor": "no.nav.navno:tavleliste",
                                "config": {}
                            }
                        ],
                        "name": "region-center"
                    },
                    "region-east": {
                        "components": [
                            {
                                "name": "tavleliste-relatert-innhold",
                                "path": "region-east/0",
                                "type": "part",
                                "descriptor": "no.nav.navno:tavleliste-relatert-innhold",
                                "config": {}
                            }
                        ],
                        "name": "region-east"
                    },
                    "region-north": {
                        "components": [],
                        "name": "region-north"
                    },
                    "region-south": {
                        "components": [],
                        "name": "region-south"
                    },
                    "region-west": {
                        "components": [],
                        "name": "region-west"
                    },
                    "scripts-region": {
                        "components": [],
                        "name": "scripts-region"
                    }
                }
            }
        })._id;
        contentLib.modify({
            key: mid,
            editor: function (c) {
                c.page = m.page;
                return c
            }
        })
        repo.modify({
            key: oid,
            editor: function (c) {
                o._indexConfig = c._indexConfig;
                return o
            }
        })
        repo.modify({
            key: tid,
            editor: function (c) {
                t._indexConfig = c._indexConfig;
                return t
            }
        })
    }
    return false
}

function changeSeksjon() {
    var start = 0;
    var count = 100;
    var r = [];
    while (count === 100) {
        var q = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('oppslagstavle')]
        });
        count = q.hits;
        r = r.concat(q.hits.map(function(el) {
            return el._id
        }));
        start += count;
    }
    r.forEach(function (value) {
        repo.modify({
            key: value,
            editor: function (c) {
                if (!c.page) c.page = {};
                c.page.template = '9ab7479e-bdab-4126-89d4-bc8ced9ba54b';
                return c;
            }
        })
    })
}

function translateContents() {
    return !hasType('main-article') ? 'Innholdstype "main-article" finnes ikke' : translateAll();

}

function translateAll() {

    //return 'all done'
   return translateNavNyhet() || translateNavPressemelding() || translateCMSStuff() || transl8('Artikkel_Brukerportal') || transl8('Kort_om')|| moveNotFounds() || pushToMaster();  'All done';
}

function pushToMaster() {
    //trans.logBeautify(contentLib.getType(contentLib.get({
    //    key: 'e955ef98-8f39-4031-aa86-a1cc36d174ae'
    //}).type))
    contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: [toContentType('tavleliste')]
    }).hits.forEach(function (value) {
        contentLib.modify({
            key: value._id,
            editor: function(c) {
                trans.logBeautify(c.data);
                if (c.data.languages) {
                    if (!c.data.menuListItems) c.data.menuListItems = [];
                    else if (!Array.isArray(c.data.menuListItems)) c.data.menuListItems = [c.data.menuListItems];
                    c.data.menuListItems.push({
                        menuListName: 'Språkversjoner',
                        link: (Array.isArray(c.data.languages)) ? c.data.languages : [ c.data.languages ]
                    })
                    delete c.data.languages;
                }
                if (Array.isArray(c.data.heading)) {
                    c.data.heading = c.data.heading[0];
                }
                return c;
            }
        })
    })
    contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: [toContentType('oppslagstavle')]
    }).hits.forEach(function (value) {
        contentLib.modify({
            key: value._id,
            editor: function(c) {
                trans.logBeautify(c.data);
                if (c.data.languages) {
                    if (!c.data.menuListItems) c.data.menuListItems = [];
                    else if (!Array.isArray(c.data.menuListItems)) c.data.menuListItems = [c.data.menuListItems];
                    c.data.menuListItems.push({
                        menuListName: 'Språkversjoner',
                        link: (Array.isArray(c.data.languages)) ? c.data.languages : [ c.data.languages ]
                    })
                    delete c.data.languages;
                }
                if (Array.isArray(c.data.heading)) {
                    c.data.heading = c.data.heading[0];
                }
                return c;
            }
        })
    })
    trans.logBeautify(contentLib.publish({
        keys: ['499cdbe1-eba1-4736-9cd2-75b79e3a1be3'],
        sourceBranch: 'draft',
        targetBranch: 'master',
        includeDependencies: true
    }));
}

function gatherRedirects() {
    var start = 0;
    var count = 100;
    var r = [];
    while (count === 100) {
        var q = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('magic-folder')]
        });
        count = q.hits.length;
        start += count;
        r = r.concat(q.hits.map(function (el) {
            return el._id
        }));
    }
    updateRedirects(r);
}

function getAllChildrenIds(c) {
    var start = 0;
    var count = 100;
    var ret = [];
    while (count === 100) {
        var q = contentLib.getChildren({
            key: c,
            start: start,
            count: count
        });
        count = q.hits.length;
        start += count;
        ret = ret.concat(q.hits.map(function (el) {
            return el._id
        }));
    }
    return ret;
}

function updateRedirects(r) {
    var ret = false;
    r.forEach(function (value) {

            var c = contentLib.get({
                key: value
            });
            if (c.hasChildren) {
                 updateRedirects(getAllChildrenIds(value))
            }
           makeMagic(value);

    });
    return ret;
}

function getUrlRedirectFolder() {
    var urf = contentLib.get({
        key: '/sites/www.nav.no/url-redirects'
    });
    if (!urf) urf = contentLib.create({
        name: 'url-redirects',
        parentPath: '/sites/www.nav.no',
        contentType: toContentType('magic-folder'),
        data: {}
    });
    return (urf) ? urf._path : false;
}

function moveNotFounds() {
    var start = 0;
    var count = 100;
    var m = [];
    while (count === 100) {
        var h = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('cms2xp_page')]
        });
        count = h.hits.length;
        start += count;
        m = m.concat(h.hits);
    }
    m.forEach(function (value) {
        if (value.hasOwnProperty('x')&&value.x.hasOwnProperty('no-nav-navno')&&value.x['no-nav-navno'].hasOwnProperty('cmsMenu')&&value.x['no-nav-navno'].cmsMenu.hasOwnProperty('content')) {
            var c = value.x['no-nav-navno'].cmsMenu.content;
            if (!contentLib.get({key: c})) {
                try {
                    contentLib.move({
                        source: value._id,
                        target: '/sites/www.nav.no/not-found/'
                    })
                } catch (e) {
                    contentLib.move({
                        source: value._id,
                        target: '/sites/www.nav.no/not-found/' + value._name + Date.now()
                    })
                }
            }
        }
    })
    return false
}

function moveRedirects() {
    var targetPath = getUrlRedirectFolder();
    if (!targetPath) return 'Failed to create or get "url-redirect"';
    var start = 0;
    var count = 100;
    var redirects = [];
    while (count === 100) {
        var h = contentLib.query({
            start: start,
            count: count,
            contentTypes: [toContentType('url'), 'base:shortcut'],
            query: '_parentPath = "/content/sites/www.nav.no"'
        });
        redirects = redirects.concat(h.hits);
        start += 100;
        count = h.hits;
    }
    trans.logBeautify(redirects);
    redirects.forEach(function (value) {
        if (value.type === toContentType('url') || value.type === 'base:shortcut') {
            if (value._name !== 'no' && value._name !== 'en' && value._name !== 'se') {
                try {
                    contentLib.move({
                        source: value._id,
                        target: targetPath + '/'
                    });
                } catch (e) {
                    log.info('Failed move');
                    trans.logBeautify(value);
                }
            }
        }

    });

    return false
}

function translateNavPressemelding() {
    return transl8('nav.pressemelding');
}

function translateCMSStuff() {
    trans.transSidebeskrivelse(getIndexConfig('tavleliste'));
    trans.transcms2xpPages(getIndexConfig('main-article'));
    trans.transMainSection(getIndexConfig('oppslagstavle'));
    trans.tmins(getIndexConfig('oppslagstavle'));
    changeSection2TavleListe();
    return false;
}

function translateNavNyhet() {
    return transl8('nav.nyhet');
}


function hasType(type) {
    return contentLib.getType(toContentType(type))
}


function stripContentType(type) {
    return type.replace(app.name + ':', "")
}

function toContentType(type) {
    return app.name + ':' + type;
}

function transl8(type) {
    return itterateContents(query(type))
}

function itterateContents(contents) {
    var ret = false;
    contents.forEach(function (value) {
        try {
            repo.modify({
                key: repo.get(value._id)._id,
                editor: editor
            })
        }
        catch (e) {
            ret = 'Failed to modify ' + value._path + ' ' + e
        }

    });
    return ret;
}


function editor(c) {
    return updateContent(c)
}

function updateContent(c) {
    if (stripContentType(c.type) in trans.ret) {
        c = trans.ret[stripContentType(c.type)](c);
        c.type = toContentType('main-article');
        c.page = {
            template: trans.getTemplate('artikkel-hovedartikkel')
        };
        c._indexConfig = getIndexConfig('main-article');
    }

    return c;
}

function query(type) {
    var hits = 100;
    var ret = [];
    while (hits) {
        hits = ret.length;
        ret = ret.concat(getHits(hits, type));
        hits = ret.length - hits;
    }
    return ret;
}

function getHits(hits, type) {
    return contentLib.query(getQueryObject(type, hits)).hits;
}

function getQueryObject(type, hits) {
    return {
        start: hits,
        count: 100,
        contentTypes: [toContentType(type)]
    };
}

function getIndexConfig(type) {
    var ret = contentLib.get({key: '/sites/www.nav.no/no/' + type});
    ret = repo.get(ret._id);
    if (!ret) {
        trans.logBeautify(ret);
        ret = contentLib.create({
            name: type,
            contentType: toContentType(type),
            valid: false,
            data: {
                'heading': type,
                ingress: type,
                text: type

            },
            parentPath: '/sites/www.nav.no/no/'
        })
    }
    ret = (ret) ? ret : repo.get('40e6d1c6-6328-4680-842f-e5c39b1e44d9');
    return ret._indexConfig
}

function changeSection2TavleListe() {
    var pagesWithChildren = [];
    var length = 100;
    var start = 0;
    while (length === 100) {
        var q = contentLib.query({
            start: start,
            count: length,
            contentTypes: [app.name + ':cms2xp_section']
        });
        length = q.hits.length;
        start += length;
        pagesWithChildren = q.hits.reduce(function (t, el) {
            if (el.page && el.page.template && el.page.template ==='debed1f9-8310-4e79-93f0-c0f64245d4fc') t.push(el);
            return t;
        }, pagesWithChildren)
    }

    pagesWithChildren.forEach(function (value) {
        trans.doTableListTranslation(value);
    });
}