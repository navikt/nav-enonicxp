
var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var trans = require('../../site/lib/contentTranslator');
var nodeLib = require('/lib/xp/node');
var repo = nodeLib.connect({
    repoId: 'cms-repo',
    branch: 'master',
    principals: ['role:system.admin']
});
exports.handle = function (socket) {
    socket.emit('newTask', createElements());
    socket.on('moveKortUrl', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            moveKU(socket);
        })
    });
}

function createElements() {
    return {
        isNew: true,
        head: 'Lag redirectsmappe og flytt kort-url',
        body: {
            elements: [
                {
                    tag: 'progress',
                    id: 'kuprogress',
                    progress: {
                        value: 'kuvalue',
                        max: 'kumax',
                        valId: 'kuval'
                    }
                },
                {
                   tag: 'button',
                    tagClass: ['isPrimary', 'button'],
                    action: 'moveKortUrl',
                    text: 'Flytt kort url'
                }
            ]
        }
    }
}

function moveKU(socket) {
    if (!content.get({key: '/redirects'})) {
        content.create({
            parentPath: '/',
            displayName: 'redirects',
            contentType: 'base:folder',
            data: {}
        })
    }
    var elements = content.query({
        start: 0,
        count: 10000,
        contentTypes: [ 'base:shortcut', app.name + ':url'],
        query: '_parentPath = "/content/www.nav.no"'
    }).hits.reduce(function (t, el) {
        if (!el.hasChildren) t.push(el);
        return t;
    },[]);

    socket.emit('kumax', elements.length);

    elements.forEach(function (el, index) {
        socket.emit('kuvalue', index +1);
        content.move({
            source:  el._path,
            target: '/redirects/'
        });



    })

}