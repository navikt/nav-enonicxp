var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('rapportHandbok', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            handleRapportHandbok(socket);
        })
    });
    socket.on('navRapportHandbok', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            handleNavRapportHandbok(socket);
        })
    });
}

function createElements() {
    return {
        isNew: true,
        head: 'Rapport håndbok',
        body: {
            elements: [{
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
                        tagClass: ['isPrimary', 'button'],
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
                        tagClass: ['isPrimary', 'button'],
                        action: 'navRapportHandbok',
                        text: 'Migrer nav rapport håndbok'
                    }
                ]
            }
            ]
        }
    }
}

function handleNavRapportHandbok(socket) {
    var navRapportHandbok = content.query({
        start: 0,
        count: 1000,
        contentTypes: [
            'no.nav.navno:nav.rapporthandbok'
        ]
    }).hits;

    socket.emit('nav-rapport-handbok-max', navRapportHandbok.length);

    navRapportHandbok.forEach(function (value, index) {
        socket.emit('nav-rapport-handbok-value', index + 1);

        var parent = content.create({
            parentPath: '/www.nav.no/tmp',
            contentType: 'no.nav.navno:main-article',
            displayName: value.displayName,
            data: {
                ingress: value.data.preface,
                text: ' '
            }
        });

        (Array.isArray(value.data.chapters) ? value.data.chapters : value.data.chapters ? [value.data.chapters] : []).forEach(function (chapterKey) {
            var chapter = content.get({ key: chapterKey });

            content.create({
                parentPath: parent._path,
                contentType: 'no.nav.navno:main-article',
                displayName: chapter.displayName,
                data: {
                    ingress: chapter.data.preface,
                    text: chapter.data.text,
                }
            });

            content.delete({
                key: chapterKey,
            });
        });

        content.delete({
            key: value._id,
        });

        var target = value._path.replace(value._name, '');
        content.move({
            source: parent._id,
            target: target,
        });
    });
}

function handleRapportHandbok(socket) {
    var rapportHandbok = content.query({
        start: 0,
        count: 1000,
        contentTypes: [
            "no.nav.navno:Rapport_handbok",
        ]
    }).hits;

    socket.emit('rapport-handbok-max', rapportHandbok.length);

    rapportHandbok.forEach(function (value, index) {
        socket.emit('rapport-handbok-value', index + 1);

        // create parent article set
        var parent = content.create({
            parentPath: '/www.nav.no/tmp',
            contentType: 'no.nav.navno:main-article',
            displayName: value.displayName,
            data: {
                ingress: value.rapport_description,
                text: ' ',
            },
        });

        // create main articles for all rapports
        (Array.isArray(value.data.rapports.rapport) ? value.data.rapports.rapport : value.data.rapports.rapport ? [value.data.rapports.rapport] : []).forEach(function (rapport, rapportIndex) {
            content.create({
                parentPath: parent._path,
                contentType: 'no.nav.navno:main-article',
                displayName: rapport.subtitle,
                data: {
                    text: rapport.text,
                    ingress: ' ',
                }
            });
        });

        // delete old rapport
        content.delete({
            key: value._id,
        });

        // move article set to old rapports path
        var target = value._path.replace(value._name, '');
        content.move({
            source: parent._path,
            target: target,
        });
    });
}