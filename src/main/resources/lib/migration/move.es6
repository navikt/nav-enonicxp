var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('move', function () {
        context.run(
            {
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system',
                },
                principals: ['role:system.admin'],
            },
            function () {
                moveNavNo(socket);
            }
        );
    });
    socket.on('createHelpers', function () {
        context.run(
            {
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system',
                },
                principals: ['role:system.admin'],
            },
            function () {
                createHelpers(socket);
            }
        );
    });
    socket.on('moveKortUrl', function () {
        context.run(
            {
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system',
                },
                principals: ['role:system.admin'],
            },
            function () {
                moveKU(socket);
            }
        );
    });
};

function createHelpers (socket) {
    if (
        content.create({
            displayName: 'tmp',
            contentType: 'base:folder',
            parentPath: '/www.nav.no/',
            branch: 'draft',
            data: {

            },
        }) &&
        content.create({
            displayName: 'not-found',
            contentType: 'base:folder',
            parentPath: '/www.nav.no/',
            branch: 'draft',
            data: {

            },
        })
    ) { socket.emit('helpersCreated', 'Hjelpemapper lagd'); } else { socket.emit('helpersCreated', 'Feilet, husk å flytte først'); }
}

function moveNavNo (socket) {
    var site = content.getSite({
        key: '/sites/www.nav.no',
    });
    if (!site) {
        socket.emit('flyttupdate', 'Finner ikke www.nav.no, mulig den allerede er flyttet');
    } else {
        if (
            content.move({
                source: site._path,
                target: '/',
            })
        ) { socket.emit('flyttupdate', 'www.nav.no flyttet'); } else {
            socket.emit('flyttupdate', 'Feilet');
        }
    }
}

function moveKU (socket) {
    if (!content.get({
        key: '/redirects',
    })) {
        content.create({
            parentPath: '/',
            displayName: 'redirects',
            contentType: 'base:folder',
            data: {

            },
        });
    }
    var elements = content
        .query({
            start: 0,
            count: 10000,
            contentTypes: ['base:shortcut', app.name + ':url'],
            query: '_parentPath = "/content/www.nav.no"',
        })
        .hits.reduce(function (t, el) {
            if (!el.hasChildren) { t.push(el); }
            return t;
        }, []);

    socket.emit('kumax', elements.length);

    elements.forEach(function (el, index) {
        socket.emit('kuvalue', index + 1);
        content.move({
            source: el._path,
            target: '/redirects/',
        });
    });
}

function createElements () {
    return {
        isNew: true,
        head: 'Først',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'p',
                            text: 'Flytt www.nav.no',
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'move',
                            text: 'Flytt',
                        },
                        {
                            tag: 'p',
                            update: 'flyttupdate',
                        },
                    ],
                },
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'p',
                            text: 'Lag hjelpemapper',
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'createHelpers',
                            text: 'Lag',
                        },
                        {
                            tag: 'p',
                            update: 'helpersCreated',
                        },
                    ],
                },
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'progress',
                            id: 'kuprogress',
                            progress: {
                                value: 'kuvalue',
                                max: 'kumax',
                                valId: 'kuval',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['isPrimary', 'button'],
                            action: 'moveKortUrl',
                            text: 'Flytt kort url',
                        },
                    ],
                },
            ],
        },
    };
}
