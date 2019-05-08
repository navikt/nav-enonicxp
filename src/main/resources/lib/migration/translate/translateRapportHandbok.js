var contentLib = require('/lib/xp/content');
var nodeLib = require('/lib/xp/node');
var tools = require('/lib/tools');

exports.handleNavRapportHandbok = handleNavRapportHandbok;
function handleNavRapportHandbok(socket) {
    var navRapportHandbok = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:nav.rapporthandbok']
    }).hits;

    socket.emit('nav-rapport-handbok-max', navRapportHandbok.length);
    var chapterIdMap = {};

    navRapportHandbok.forEach(function(value, index) {
        log.info('start converting nav rapport handbok: ' + value._id);

        // re-create nav rapport hanbok as a main article
        var parent = contentLib.create({
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
            var chapter = contentLib.get({ key: chapterKey });

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
        contentLib.delete({
            key: value._id
        });

        // move to original handbok path
        var target = getTargetPath(value);
        try {
            contentLib.move({
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
    var navRapportHandbokChapters = contentLib.query({
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
            contentLib.delete({
                key: chapter._id
            });
            // move new chapter to old chapters position
            var target = getTargetPath(chapter);
            try {
                contentLib.move({
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
        contentLib.delete({
            key: chapterKey
        });
    }
}

function convertChapter(chapter, path) {
    var menuListItems = null;
    menuListItems = tools.addMenuListItem(menuListItems, 'form-and-application', getNewSchemas(chapter));
    menuListItems = tools.addMenuListItem(menuListItems, 'related-information', getInformation(chapter));

    var chapterArticle = contentLib.create({
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

exports.handleRapportHandbok = handleRapportHandbok;
function handleRapportHandbok(socket) {
    var rapportHandbok = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:Rapport_handbok']
    }).hits;

    socket.emit('rapport-handbok-max', rapportHandbok.length);

    rapportHandbok.forEach(function(value, index) {
        log.info('start converting rapport handbok: ' + value._id);

        // create parent article set
        var links = getLinks(value);
        var parent = contentLib.create({
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
                var rapportArticle = contentLib.create({
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
        contentLib.delete({
            key: value._id
        });

        // move article set to old rapports path
        var target = getTargetPath(value);
        try {
            contentLib.move({
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
        var cmsRepo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
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

function updateRef(oldId, newId) {
    var refs = contentLib.query({
        start: 0,
        count: 1000,
        query: '_references = "' + oldId + '"'
    }).hits;

    refs.forEach(function(a) {
        tools.modify(a, newId, oldId);
    });
}

function setTime(articles, createdTime, modifiedTime) {
    var cmsRepo = nodeLib.connect({
        repoId: 'com.enonic.cms.default',
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
