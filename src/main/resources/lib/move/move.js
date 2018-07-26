var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('move', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            moveNavNo(socket);
        })

    });
    socket.on('createHelpers', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            createHelpers(socket);
        })

    })

}

function createHelpers(socket) {
    if (content.create({
        displayName: 'tmp',
        contentType: 'base:folder',
        parentPath: '/www.nav.no/',
        branch: 'draft',
        data: {}
    }) && content.create({
        displayName: 'not-found',
        contentType: 'base:folder',
        parentPath: '/www.nav.no/',
        branch: 'draft',
        data: {}
    })) socket.emit('helpersCreated', 'Hjelpemapper lagd');
    else socket.emit('helpersCreated', 'Feilet, husk å flytte først');
}

function moveNavNo(socket) {

    var site = content.getSite({
        key: '/sites/www.nav.no'
    });
    if (!site) {
        socket.emit('flyttupdate', 'Finner ikke www.nav.no, mulig den allerede er flyttet');
    }
    else {
        if (content.move({
            source: site._path,
            target: '/'
        })) socket.emit('flyttupdate', 'www.nav.no flyttet');
        else {
            socket.emit('flyttupdate', 'Feilet');
        }
    }
}

function createElements() {
    return {
        isNew: true,
        head: 'Først',
        body: {
            elements: [
                {
                    tag: 'p',
                    text: 'Flytt www.nav.no'
                },
                {
                    tag: 'button',
                    tagClass: ['button', 'is-info'],
                    action: 'move',
                    text: 'Flytt'
                },
                {
                    tag: 'p',
                    update: 'flyttupdate'
                },
                {
                    tag: 'p',
                    text: 'Lag hjelpemapper'
                },
                {
                    tag: 'button',
                    tagClass: ['button', 'is-info'],
                    action: 'createHelpers',
                    text: 'Lag'
                },
                {
                    tag: 'p',
                    update: 'helpersCreated'
                }
            ]
        }


    }
}