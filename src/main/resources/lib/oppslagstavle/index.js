var content = require('/lib/xp/content');
var context = require('/lib/xp/context');

exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);

    socket.on('dump-oppslagstavle-info', function() {
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
                dump(socket);
            }
        );
    });
};

function toArray(a) {
    return a ? (Array.isArray(a) ? a : [a]) : [];
}

function dump(socket) {
    var section = content.get({
        key: 'a939a874-6422-4ac0-801f-5f0555cd2883',
    });
    socket.emit('console.log', section);
    var sectionContents = [];
    if (section.data.sectionContents) {
        sectionContents = content
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
    socket.emit('console.log', sectionContents)
}

function dump_old(socket) {
    var oppslagstavler = content
        .query({
            start: 0,
            count: 5000,
            query: 'type = "no.nav.navno:oppslagstavle"'
        })
        .hits.map(function(o) {
            log.info(o._path);
            var scContents = toArray(o.data.scContents);
            var newsContents = toArray(o.data.newsContents);
            var ntkContents = toArray(o.data.ntkContents);
            var newsFolder = content.get({ key: o._path + '/nyheter' });
            var shortcutsFolder = content.get({ key: o._path + '/snarveier' });
            var niceToKnowFolder = content.get({ key: o._path + '/nyttig-a-vite' });

            var newsMatch = true;
            if (newsFolder && newsFolder.data && newsFolder.data.sectionContents) {
                newsFolder.data.sectionContents = toArray(newsFolder.data.sectionContents);
                newsContents.forEach(function(news) {
                    if (newsMatch) {
                        newsMatch = newsFolder.data.sectionContents.indexOf(news) > -1;
                    }
                });
                var children = content.getChildren({ key: newsFolder._id, count: 1000 }).hits;
                children.forEach(function(c) {
                    var index = newsFolder.data.sectionContents.indexOf(c._id);
                    if (index > -1) {
                        if (newsMatch) {
                            newsMatch = true;
                        }
                    } else {
                        newsMatch = false;
                        // log.info('news ' + c._id + ' (' + c._path + ') does not exist in ' + newsFolder._id);
                    }
                });
                newsFolder.data.sectionContents.forEach(function(news) {
                    var inChildren = children.reduce(function(found, c) {
                        return found ? found : c._id === news;
                    }, false);
                    if (!inChildren) {
                        var c = content.get({
                            key: news
                        });
                        if (c) {
                            // log.info('news needs sc to ' + news + ' (' + c._path + ')');
                        }
                    }
                });
            }

            if (!newsFolder && newsContents.length > 0) {
                log.info('needs news folder');
                var newsList = [];
                newsContents.forEach(function(newsId) {
                    var news = content.get({
                        key: newsId
                    });
                    if (news) {
                        newsList.push(news);
                    }
                });
                var prevPath = null;
                var samePath = true;
                newsList.forEach(function(news) {
                    if (samePath && prevPath && prevPath !== news._path.replace(news._name, '')) {
                        samePath = false;
                    }
                    prevPath = news._path.replace(news._name, '');
                });
                if (samePath) {
                    log.info('same path for all news');
                } else {
                    log.info('needs new folder with shortcuts');
                }
            }
         

            var scMatch = true;
            if (shortcutsFolder && shortcutsFolder.data && shortcutsFolder.data.sectionContents) {
                shortcutsFolder.data.sectionContents = toArray(shortcutsFolder.data.sectionContents);
                scContents.forEach(function(sc) {
                    if (scMatch) {
                        scMatch = shortcutsFolder.data.sectionContents.indexOf(sc) > -1;
                    }
                });
                var children = content.getChildren({ key: shortcutsFolder._id, count: 1000 }).hits;
                children.forEach(function(c) {
                    var index = shortcutsFolder.data.sectionContents.indexOf(c._id);
                    if (index > -1) {
                        if (scMatch) {
                            scMatch = true;
                        }
                    } else {
                        scMatch = false;
                        // log.info('sc ' + c._id + ' (' + c._path + ') does not exist in ' + shortcutsFolder._id);
                    }
                });
                shortcutsFolder.data.sectionContents.forEach(function(sc) {
                    var inChildren = children.reduce(function(found, c) {
                        return found ? found : c._id === sc;
                    }, false);
                    if (!inChildren) {
                        var c = content.get({
                            key: sc
                        });
                        if (c) {
                            // log.info('sc needs sc to ' + sc + ' (' + c._path + ')');
                        }
                    }
                });
            }

            if (!shortcutsFolder && scContents.length > 0) {
                log.info('needs sc folder');
                var newsList = [];
                scContents.forEach(function(scId) {
                    var sc = content.get({
                        key: scId
                    });
                    if (sc) {
                        newsList.push(sc);
                    }
                });
                var prevPath = null;
                var samePath = true;
                newsList.forEach(function(sc) {
                    if (samePath && prevPath && prevPath !== sc._path.replace(sc._name, '')) {
                        samePath = false;
                    }
                    prevPath = sc._path.replace(sc._name, '');
                });
                if (samePath) {
                    log.info('same path for all scs');
                } else {
                    log.info('needs new folder with shortcuts');
                }
            }

            var ntkMatch = true;
            if (niceToKnowFolder && niceToKnowFolder.data && niceToKnowFolder.data.sectionContents) {
                niceToKnowFolder.data.sectionContents = toArray(niceToKnowFolder.data.sectionContents);
                ntkContents.forEach(function(ntk) {
                    if (ntkMatch) {
                        ntkMatch = niceToKnowFolder.data.sectionContents.indexOf(ntk) > -1;
                    }
                });
                var children = content.getChildren({ key: niceToKnowFolder._id, count: 1000 }).hits;
                children.forEach(function(c) {
                    var index = niceToKnowFolder.data.sectionContents.indexOf(c._id);
                    if (index > -1) {
                        if (ntkMatch) {
                            ntkMatch = true;
                        }
                    } else {
                        ntkMatch = false;
                        // log.info('ntk ' + c._id + ' (' + c._path + ') does not exist in ' + niceToKnowFolder._id);
                    }
                });
                niceToKnowFolder.data.sectionContents.forEach(function(ntk) {
                    var inChildren = children.reduce(function(found, c) {
                        return found ? found : c._id === ntk;
                    }, false);
                    if (!inChildren) {
                        var c = content.get({
                            key: ntk
                        });
                        if (c) {
                            // log.info('ntk needs sc to ' + ntk + ' (' + c._path + ')');
                        }
                    }
                });
            }

            if (!niceToKnowFolder && ntkContents.length > 0) {
                log.info('needs ntk folder');
                var newsList = [];
                ntkContents.forEach(function(ntkId) {
                    var ntk = content.get({
                        key: ntkId
                    });
                    if (ntk) {
                        newsList.push(ntk);
                    }
                });
                var prevPath = null;
                var samePath = true;
                newsList.forEach(function(ntk) {
                    if (samePath && prevPath && prevPath !== ntk._path.replace(ntk._name, '')) {
                        samePath = false;
                    }
                    prevPath = ntk._path.replace(ntk._name, '');
                });
                if (samePath) {
                    log.info('same path for all ntks');
                } else {
                    log.info('needs new folder with shortcuts');
                }
            }

            return {
                id: o._id,
                path: o._path,
                hasNewsFolder: !!newsFolder,
                newsContents: newsContents,
                newsMatch: newsMatch,
                hasShortcuts: !!shortcutsFolder,
                scContents: scContents,
                scMatch: scMatch,
                hasNiceToKnow: !!niceToKnowFolder,
                ntkContents: ntkContents,
                ntkMatch: ntkMatch
            };
        });

    socket.emit('console.log', oppslagstavler);
}

function createElements() {
    return {
        isNew: true,
        head: 'Konverter oppslagstavle',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Dump info'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'dump-oppslagstavle-info',
                            progress: {
                                value: 'dump-oppslagstavle-info-value',
                                max: 'dump-oppslagstavle-info-max',
                                valId: 'dump-oppslagstavle-info-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'dump-oppslagstavle-info',
                            text: 'Dump'
                        }
                    ]
                }
            ]
        }
    };
}
