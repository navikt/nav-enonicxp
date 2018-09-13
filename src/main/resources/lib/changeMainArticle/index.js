var contentLib = require('/lib/xp/content');
var context = require('/lib/xp/context');
var http = require('/lib/http-client');
var nodeLib = require('/lib/xp/node');
var task = require('/lib/xp/task');
var repo = nodeLib.connect({
    repoId: 'cms-repo',
    branch: 'draft',
    principals: ['role:system.admin']
});

var elements = createNewElements();
exports.handle = function (socket) {
    socket.emit('newTask', elements);
    socket.on('oma-start', function () {
        start(socket);
    })
};

function start(socket) {
    context.run({
        repository: 'cms-repo',
        branch: 'draft',
        user: {
            login: 'pad',
            userStore: 'system'
        },
        principals: ["role:system.admin"]
    }, function () {
        update(socket);
    })
}

function update(socket) {
    var hits = contentLib.query({
        start: 0,
        count: 100000,
        contentTypes: [ app.name + ':main-article']
    }).hits;
    socket.emit('omm', hits.length);
    hits.map(function mapMain(element, index) {
        socket.emit('omv', index + 1);
        if (element.data.hasOwnProperty('menuListItems') && (!element.language || element.language === 'no')) {
            var newMenuListItems = {
                _selected: []
            }
            var oldMenuListItems = Array.isArray(element.data.menuListItems) ? element.data.menuListItems : [element.data.menuListItems];
            newMenuListItems = oldMenuListItems.reduce(function (t, value) {

                    if (value.menuListName === 'Relatert innhold' || value.menuListName === 'Relatert informasjon' || value.menuListName === 'Spørsmål og svar') {
                        value.menuListName = 'Relatert_innhold';
                    }
                    if (value.link) {
                        value.link = Array.isArray(value.link) ? value.link : [value.link];
                        value.link.forEach(function (link) {
                            if (contentLib.get({key: link})) {
                                if (t._selected.indexOf(value.menuListName) === -1) t._selected.push(value.menuListName);
                                if (!t[value.menuListName]) t[value.menuListName] = {link: link};
                                else {
                                    t[value.menuListName].link = Array.isArray(t[value.menuListName].link) ? t[value.menuListName].link : [t[value.menuListName].link]
                                    t[value.menuListName].link.push(link);
                                }
                            }
                        });

                    }

                return t;
            }, newMenuListItems);
            try {
                contentLib.modify({
                    key: element._id,
                    editor: function (c) {
                        delete c.data.heading;
                        delete c.data.factLocation;
                        delete c.data.tilbakemelding;
                        delete c.x;
                        c.data.menuListItems = newMenuListItems;
                        return c;
                    }
                })
            } catch (e) {
                log.info(JSON.stringify(newMenuListItems, null, 4));
                log.info(JSON.stringify(element,null,4));

                throw e
            }
        }
        else if (element.language && element.language !== 'no') {
            log.info(JSON.stringify(element, null, 4));
        }
    })
}

function createNewElements() {
    return {
        isNew: true,
        head: 'Oppdater main-article',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'p',
                            text: 'Oppdater'
                        },
                        {
                            tag: 'progress',
                            tagClass: [ 'progress', 'is-info'],
                            id: 'oma',
                            progress: {
                                value: 'omv',
                                max: 'omm'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: [ 'button', 'is-primary' ],
                            action: 'oma-start',
                            text: 'Start'
                        }
                    ]
                }

            ]
        }
    }
}