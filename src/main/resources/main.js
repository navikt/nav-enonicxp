var taskLib = require('/lib/xp/task');
var contextLib = require('/lib/xp/context');

var page = require('/migration/page/page');
var deleteStep = require('/migration/steps/delete-content');
var moveStep = require('/migration/steps/move-content');
var notinuseStep = require('/migration/steps/list-notinuse');


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

    } else if (action === 'listNotinuse') {
        taskId = async('List NotInUse', notinuseStep.execute);

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

/*
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

event.listener({
    type: '*',
    callback: function (res) {
        if (res.type === 'node.renamed' && res.data.nodes.length === 1 && !res.data.nodes[0].path.split("/").pop().startsWith("__unnamed__")) {
            makeMagic(res.data.nodes[0].id)
        }
        else if (res.type === 'node.moved'){
            makeMagic(res.data.nodes[0].id)
        }
    }
});

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
    var message = translateContents();
   // changeSeksjon();
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
    return translateNavNyhet() || moveRedirects() || gatherRedirects() || translateNavPressemelding() || translateCMSStuff() || transl8('Artikkel_Brukerportal') || transl8('Kort_om')|| 'All done';
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
    trans.transcms2xpPages(getIndexConfig('main-article'));
    trans.transMainSection(getIndexConfig('oppslagstavle'));
    trans.tmins(getIndexConfig('oppslagstavle'));
    trans.transSidebeskrivelse(getIndexConfig('tavleliste'));
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
}*/