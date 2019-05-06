var contentLib = require('/lib/xp/content');
var context = require('/lib/xp/context');
var node = require('/lib/xp/node');
var valueLib = require('/lib/xp/value');

exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('convertStringToDateTime', function() {
        context.run(
            {
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                convertStringToDateTime(socket);
            }
        );
    });

    socket.on('oma-start', function() {
        context.run(
            {
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                changeMainArticle(socket);
            }
        );
    });

    socket.on('fiks-tavlelistene', function() {
        context.run(
            {
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                fiksTavlelistene(socket);
            }
        );
    });
};

var totalCount = 0;
var currentCount = 0;
function convertStringToDateTime(socket) {
    totalCount = 0;
    currentCount = 0;
    var repo = node.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'draft',
        principals: ['role:system.admin']
    });
    var startElems = ['/content/www.nav.no', '/content/content', '/content/redirects'];
    convert(repo, socket, startElems);
}

function convert(repo, socket, elems) {
    totalCount += elems.length;
    socket.emit('convert-string-to-datetime-max', totalCount);
    elems.forEach(function(key) {
        log.info(key);
        currentCount += 1;
        socket.emit('convert-string-to-datetime-value', currentCount);
        repo.modify({
            key: key,
            editor: function(elem) {
                if (elem.createdTime) {
                    elem.createdTime = valueLib.instant(elem.createdTime);
                }
                if (elem.modifiedTime) {
                    elem.modifiedTime = valueLib.instant(elem.modifiedTime);
                }
                if (elem.publish) {
                    if (elem.publish.first) {
                        elem.publish.first = valueLib.instant(elem.publish.first);
                    }
                    if (elem.publish.from) {
                        elem.publish.from = valueLib.instant(elem.publish.from);
                    }
                    if (elem.publish.to) {
                        elem.publish.to = valueLib.instant(elem.publish.to);
                    }
                }
                return elem;
            }
        });

        var children = repo
            .findChildren({
                start: 0,
                count: 5000,
                parentKey: key
            })
            .hits.map(function(c) {
                return c.id;
            });

        if (children.length > 0) {
            convert(repo, socket, children);
        }
    });
}

function changeMainArticle(socket) {
    var hits = contentLib.query({
        start: 0,
        count: 100000,
        contentTypes: [app.name + ':main-article']
    }).hits;
    socket.emit('omm', hits.length);
    hits.map(function mapMain(element, index) {
        socket.emit('omv', index + 1);
        // update menu list items and language for all norwegian articles with menu list items
        if (element.data.hasOwnProperty('menuListItems') && (!element.language || element.language === 'no')) {
            var newMenuListItems = {
                _selected: []
            };

            // loop over old menu list items and push into new structure
            var oldMenuListItems = Array.isArray(element.data.menuListItems) ? element.data.menuListItems : [element.data.menuListItems];
            newMenuListItems = oldMenuListItems.reduce(function(t, value) {
                // rename relatert innhold to match
                if (value.menuListName === 'Relatert innhold' || value.menuListName === 'Relatert informasjon' || value.menuListName === 'Spørsmål og svar') {
                    value.menuListName = 'Relatert_innhold';
                }
                // check for valid links in list
                if (value.link) {
                    value.link = Array.isArray(value.link) ? value.link : [value.link];
                    value.link.forEach(function(link) {
                        if (contentLib.get({ key: link })) {
                            // add to list of selected menu list items if it's not already there
                            if (t._selected.indexOf(value.menuListName) === -1) {
                                t._selected.push(value.menuListName);
                            }

                            // add link to list of links
                            if (!t[value.menuListName]) {
                                t[value.menuListName] = { link: link };
                            } else {
                                t[value.menuListName].link = Array.isArray(t[value.menuListName].link)
                                    ? t[value.menuListName].link
                                    : [t[value.menuListName].link];
                                t[value.menuListName].link.push(link);
                            }
                        }
                    });
                }

                return t;
            }, newMenuListItems);
            try {
                // modify main-article with new menu list and remove old cms data
                contentLib.modify({
                    key: element._id,
                    editor: function(c) {
                        delete c.data.heading;
                        delete c.data.factLocation;
                        delete c.data.tilbakemelding;
                        delete c.x;
                        c.data.menuListItems = newMenuListItems;
                        return c;
                    }
                });
            } catch (e) {
                log.info(JSON.stringify(newMenuListItems, null, 4));
                log.info(JSON.stringify(element, null, 4));

                throw e;
            }
        } else if (element.language && element.language !== 'no') {
            log.info(JSON.stringify(element, null, 4));
        }
    });
}

function fiksTavlelistene(socket) {
    var alle = contentLib.query({
        start: 0,
        count: 100000,
        contentTypes: [app.name + ':tavleliste']
    }).hits;
    socket.emit('fiks-tavlelistene-max', alle.length);
    alle.forEach(function(value, index) {
        socket.emit('fiks-tavlelistene-value', index + 1);
        (Array.isArray(value.data.sectionContents) ? value.data.sectionContents : [value.data.sectionContents]).forEach(function(id) {
            log.info(id);
            if (!id) {
                log.info(JSON.stringify(value, null, 4));
                return;
            }
            var val = contentLib.get({ key: id });
            if (!val) {
                return;
            }
            if (val.type === app.name + ':nav.sidebeskrivelse') {
                contentLib.modify({
                    key: value._id,
                    editor: function(c) {
                        c.data.ingress = val.data.ingress || val.data.description;
                        if (c.data.parameters) delete c.data.parameters;
                        if (c.data.heading) delete c.data.heading;
                        return c;
                    }
                });
                try {
                    contentLib.delete({
                        key: id
                    });
                } catch (e) {
                    log.info(e);
                }
            } else {
                if (val._path.indexOf('/www.nav.no/') === -1) {
                    contentLib.move({
                        source: val._id,
                        target: value._path + '/'
                    });
                }
            }
        });
    });
}

function createElements() {
    return {
        isNew: true,
        head: 'Validate and fix data',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'String => DateTime'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'convert-string-to-datetime',
                            progress: {
                                value: 'convert-string-to-datetime-value',
                                max: 'convert-string-to-datetime-max',
                                valId: 'convert-string-to-datetime-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'convertStringToDateTime',
                            text: 'Convert'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'p',
                            text: 'Update main-article'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'oma',
                            progress: {
                                value: 'omv',
                                max: 'omm'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-primary'],
                            action: 'oma-start',
                            text: 'Update'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Fiks tavlelistene'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'fiks-tavlelistene',
                            progress: {
                                value: 'fiks-tavlelistene-value',
                                max: 'fiks-tavlelistene-max',
                                valId: 'fiks-tavlelistene-progress-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fiks-tavlelistene',
                            text: 'Fiks'
                        }
                    ]
                }
            ]
        }
    };
}
