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
}

function createElements() {
    return {
        isNew: true,
        head: 'Rapport håndbok',
        body: {
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
        }
    }
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
        socket.emit('rapport-handbok-value', index);

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
        (Array.isArray(value.data.rapports.rapport) ? value.data.rapports.rapport : [value.data.rapports.rapport]).forEach(function (rapport, rapportIndex) {
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