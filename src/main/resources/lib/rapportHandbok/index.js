var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var node = require('/lib/xp/node');
var tools = require('/lib/tools');
exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('rapportHandbok', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                // logDebugInfoRapportHandbok(socket);
                handleRapportHandbok(socket);
            }
        );
    });
    socket.on('navRapportHandbok', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                // logDebugInfoNavRapportHandbok(socket);
                handleNavRapportHandbok(socket);
            }
        );
    });
};

function createElements() {
    return {
        isNew: true,
        head: 'Rapport håndbok',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'rapport-handbok',
                            progress: {
                                value: 'rapport-handbok-value',
                                max: 'rapport-handbok-max',
                                valId: 'rapport-handbok-val-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-primary', 'button'],
                            action: 'rapportHandbok',
                            text: 'Migrer rapport håndbok'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'nav-rapport-handbok',
                            progress: {
                                value: 'nav-rapport-handbok-value',
                                max: 'nav-rapport-handbok-max',
                                valId: 'nav-rapport-handbok-val-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-primary', 'button'],
                            action: 'navRapportHandbok',
                            text: 'Migrer nav rapport håndbok'
                        }
                    ]
                }
            ]
        }
    };
}

function handleNavRapportHandbok(socket) {
    var navRapportHandbok = content.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:nav.rapporthandbok']
    }).hits;

    socket.emit('nav-rapport-handbok-max', navRapportHandbok.length);
    var chapterIdMap = {};

    navRapportHandbok.forEach(function(value, index) {
        log.info('start converting nav rapport handbok: ' + value._id);

        // re-create nav rapport hanbok as a main article
        var parent = content.create({
            parentPath: '/www.nav.no/tmp/',
            contentType: 'no.nav.navno:main-article',
            displayName: value.displayName,
            data: {
                ingress: value.data.preface,
                text: ' ',
                languages: value.data.languages
            }
        });

        // update time on the new article to match the old one
        setTime([parent], value.createdTime, value.modifiedTime);
        // update handbok refs
        updateRef(value._id, parent._id);

        (Array.isArray(value.data.chapters) ? value.data.chapters : value.data.chapters ? [value.data.chapters] : []).forEach(function(chapterKey) {
            log.info('start chapter: ' + chapterKey);
            var chapter = content.get({ key: chapterKey });

            // re-create chapter as main article as a child of the parent
            if (chapter) {
                var chapterArticle = convertChapter(chapter, parent._path);
                // map old ids to new ids, unless they are already there
                if (!chapterIdMap[chapterKey]) {
                    chapterIdMap[chapterKey] = chapterArticle._id;
                } else {
                    log.info(
                        'chapter ' +
                            chapter._id +
                            ' (' +
                            chapter._path +
                            ') is used twice, and a duplicate has been created (all refs will point to: ' +
                            chapterIdMap[chapterKey] +
                            ')'
                    );
                }

                log.info('converted nav rapport handbok chapter from ' + chapter._id + ' (' + chapter._path + ') to ' + chapterArticle._id);
            } else {
                log.info('could not find nav rapport handbok chapter ' + chapterKey);
            }
        });

        // bring contentHome from old to new, in case content home migration hasn't been run
        bringCmsXProps(value, parent);

        // delete original handbok
        content.delete({
            key: value._id
        });

        // move to original handbok path
        var target = getTargetPath(value);
        try {
            content.move({
                source: parent._id,
                target: target
            });
        } catch (e) {
            log.info("Can't move " + parent._id + ' to ' + target);
            log.info(e);
        }

        log.info('converted nav rapport handbok from ' + value._id + ' (' + value._path + ') to ' + parent._id + ' (' + target + ')');
        socket.emit('nav-rapport-handbok-value', index + 1);
    });

    // convert chapters not connected to a rapport
    var navRapportHandbokChapters = content.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:nav.rapporthandbok.kap']
    }).hits;
    socket.emit('nav-rapport-handbok-max', navRapportHandbok.length + navRapportHandbokChapters.length);

    navRapportHandbokChapters.forEach(function(chapter, index) {
        // only convert chapters that are not already converted
        if (!chapterIdMap[chapterKey]) {
            var chapterArticle = convertChapter(chapter, '/www.nav.no/tmp/');

            // update refs for lose chapters
            updateRef(chapter._id, chapterArticle._id);
            // delete old chapter
            content.delete({
                key: chapter._id
            });
            // move new chapter to old chapters position
            var target = getTargetPath(chapter);
            try {
                content.move({
                    source: chapterArticle._id,
                    target: target
                });
            } catch (e) {
                log.info("Can't move " + chapter._id + ' to ' + target);
                log.info(e);
            }
            log.info('converted nav rapport handbok chapter from ' + chapter._id + ' (' + chapter._path + ') to ' + chapterArticle._id);
        }
        socket.emit('nav-rapport-handbok-value', navRapportHandbok.length + index + 1);
    });

    // update chapter refs after all articles have been created because of duplicate chapter refs to the same chapter
    for (var chapterKey in chapterIdMap) {
        updateRef(chapterKey, chapterIdMap[chapterKey]);
        // delete original chapter
        content.delete({
            key: chapterKey
        });
    }
}

function convertChapter(chapter, path) {
    var menuListItems = null;
    menuListItems = tools.addMenuListItem(menuListItems, 'form-and-application', getNewSchemas(chapter));
    menuListItems = tools.addMenuListItem(menuListItems, 'related-information', getInformation(chapter));

    var chapterArticle = content.create({
        parentPath: path,
        contentType: 'no.nav.navno:main-article',
        displayName: chapter.displayName,
        data: {
            ingress: chapter.data.preface,
            text: chapter.data.text,
            menuListItems: menuListItems,
            social: getSocial(chapter)
        }
    });
    // update time on the new article to match the old one
    setTime([chapterArticle], chapter.createdTime, chapter.modifiedTime);
    return chapterArticle;
}

function handleRapportHandbok(socket) {
    var rapportHandbok = content.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:Rapport_handbok']
    }).hits;

    socket.emit('rapport-handbok-max', rapportHandbok.length);

    rapportHandbok.forEach(function(value, index) {
        log.info('start converting rapport handbok: ' + value._id);

        // create parent article set
        var links = getLinks(value);
        var parent = content.create({
            parentPath: '/www.nav.no/tmp/',
            contentType: 'no.nav.navno:main-article',
            displayName: value.displayName,
            data: {
                ingress: value.data.rapport_description,
                text: ' ',
                menuListItems: tools.addMenuListItem(null, 'related-information', links)
            }
        });

        var articles = [parent];

        // create main articles for all rapports
        (Array.isArray(value.data.rapports.rapport) ? value.data.rapports.rapport : value.data.rapports.rapport ? [value.data.rapports.rapport] : []).forEach(
            function(rapport, rapportIndex) {
                var rapportArticle = content.create({
                    parentPath: parent._path,
                    contentType: 'no.nav.navno:main-article',
                    displayName: rapport.subtitle,
                    data: {
                        text: rapport.text,
                        ingress: ' '
                    }
                });
                articles.push(rapportArticle);
                log.info('created article from rapport: ' + rapportArticle._id);
            }
        );

        setTime(articles, value.createdTime, value.modifiedTime);
        updateRef(value._id, parent._id);

        // bring contentHome from old to new, in case content home migration hasn't been run
        bringCmsXProps(value, parent);

        // delete old rapport
        content.delete({
            key: value._id
        });

        // move article set to old rapports path
        var target = getTargetPath(value);
        try {
            content.move({
                source: parent._path,
                target: target
            });
        } catch (e) {
            log.info("Can't move " + parent._id + ' to ' + target);
            log.info(e);
        }

        log.info('converted rapport handbok from ' + value._id + ' (' + value._path + ') to ' + parent._id);
        socket.emit('rapport-handbok-value', index + 1);
    });
}

function getTargetPath(value) {
    var target = value._path.replace(value._name, '');
    return target;
}

function bringCmsXProps(value, article) {
    var cmsProps;
    if (value.x['no-nav-navno']) {
        cmsProps = value.x['no-nav-navno'];
    }

    if (cmsProps) {
        var cmsRepo = node.connect({
            repoId: 'cms-repo',
            branch: 'draft'
        });

        cmsRepo.modify({
            key: article._id,
            editor: function(a) {
                a.x = {
                    'no-nav-navno': cmsProps
                };
                return a;
            }
        });
    }
}

function getNewSchemas(value) {
    var ns = value.data.newsschemas;
    if (!Array.isArray(ns)) ns = [ns];
    return ns.reduce(function(t, el) {
        if (el) t.push(el);
        return t;
    }, []);
}

function getSocial(value) {
    var ret = [];
    if (value.data.hasOwnProperty('share-facebook')) {
        if (value.data['share-facebook']) ret.push('facebook');
    }
    if (value.data.hasOwnProperty('share-twitter')) {
        if (value.data['share-twitter']) ret.push('twitter');
    }
    if (value.data.hasOwnProperty('share-linkedin')) {
        if (value.data['share-linkedin']) ret.push('linkedin');
    }
    return ret;
}

function getInformation(value) {
    if (value && value.data && value.data.information) {
        if (Array.isArray(value.data.information)) {
            return value.data.information;
        }
        return [value.data.information];
    }
    return [];
}

function getLinks(value) {
    if (value && value.data && value.data.links) {
        if (Array.isArray(value.data.links)) {
            return value.data.links
                .map(function(link) {
                    return link && link.contents ? link.contents : null;
                })
                .reduce(function(t, v) {
                    if (v) t.push(v);
                    return t;
                }, []);
        } else if (value.data.links.link && value.data.links.link.contents) {
            return [value.data.links.link.contents];
        }
    }
    return [];
}

function logDebugInfoNavRapportHandbok(socket) {
    socket.emit(
        'console.log',
        content
            .query({
                start: 0,
                count: 10000,
                contentTypes: ['no.nav.navno:nav.rapporthandbok.kap']
            })
            .hits.reduce(function(m, v) {
                m[v._id] = v.data;
                return m;
            }, {})
    );

    var navRapportHandbok = content.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:nav.rapporthandbok']
    }).hits;

    socket.emit('nav-rapport-handbok-max', navRapportHandbok.length);
    var refInfo = {
        unusedKaps: {}
    };
    var isKapUsed = {};

    navRapportHandbok.forEach(function(value, index) {
        var refs = tools.getRefInfo(value._id);
        refs.kap = {};
        refInfo[value._id] = refs;

        (Array.isArray(value.data.chapters) ? value.data.chapters : value.data.chapters ? [value.data.chapters] : []).forEach(function(chapterKey) {
            refs.kap[chapterKey] = tools.getRefInfo(chapterKey);
            isKapUsed[chapterKey] = true;
        });
        socket.emit('nav-rapport-handbok-value', index + 1);
    });

    var kapHits = content.query({
        start: 0,
        count: 1000,
        query: 'type = "no.nav.navno:nav.rapporthandbok.kap"'
    }).hits;

    kapHits.forEach(function(kap) {
        if (!isKapUsed[kap._id]) {
            refInfo.unusedKaps[kap._id] = tools.getRefInfo(kap._id);
        }
    });

    socket.emit('console.log', refInfo);
}

function logDebugInfoRapportHandbok(socket) {
    var rapportHandbok = content.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:Rapport_handbok']
    }).hits;

    socket.emit('rapport-handbok-max', rapportHandbok.length);
    var refInfo = {};

    rapportHandbok.forEach(function(value, index) {
        refInfo[value._id] = tools.getRefInfo(value._id);
        socket.emit('rapport-handbok-value', index + 1);
    });

    socket.emit('console.log', refInfo);
}

function updateRef(oldId, newId) {
    var refs = content.query({
        start: 0,
        count: 1000,
        query: '_references = "' + oldId + '"'
    }).hits;

    refs.forEach(function(a) {
        tools.modify(a, oldId, newId);
    });
}

function setTime(articles, createdTime, modifiedTime) {
    var cmsRepo = node.connect({
        repoId: 'cms-repo',
        branch: 'draft'
    });

    articles.forEach(function(article) {
        cmsRepo.modify({
            key: article._id,
            editor: function(a) {
                a.createdTime = createdTime;
                a.modifiedTime = modifiedTime;
                return a;
            }
        });
    });
}
