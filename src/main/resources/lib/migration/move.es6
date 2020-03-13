const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    tools: require('/lib/migration/tools'),
};
exports.handle = function (socket) {
    const elements = createElements();
    socket.emit('newTask', elements);

    socket.on('move', () => {
        libs.tools.runInContext(socket, moveNavNo);
    });
    socket.on('createHelpers', () => {
        libs.tools.runInContext(socket, createHelpers);
    });
    socket.on('moveKortUrl', () => {
        libs.tools.runInContext(socket, moveKU);
    });
    socket.on('moveResources', () => {
        libs.tools.runInContext(socket, moveResources);
    });
};

function createHelpers (socket) {
    if (
        libs.content.create({
            displayName: 'tmp',
            contentType: 'base:folder',
            parentPath: '/www.nav.no/',
            branch: 'draft',
            data: {

            },
        }) &&
        libs.content.create({
            displayName: 'not-found',
            contentType: 'base:folder',
            parentPath: '/www.nav.no/',
            branch: 'draft',
            data: {

            },
        })
    ) {
        socket.emit('helpersCreated', 'Hjelpemapper lagd');
    } else {
        socket.emit('helpersCreated', 'Feilet, husk å flytte først');
    }
}

function moveNavNo (socket) {
    const site = libs.content.getSite({
        key: '/sites/www.nav.no',
    });
    if (!site) {
        socket.emit('flyttupdate', 'Finner ikke www.nav.no, mulig den allerede er flyttet');
    } else {
        if (
            libs.content.move({
                source: site._path,
                target: '/',
            })
        ) {
            socket.emit('flyttupdate', 'www.nav.no flyttet');
        } else {
            socket.emit('flyttupdate', 'Feilet');
        }
    }
}

function moveKU (socket) {
    if (
        !libs.content.get({
            key: '/redirects',
        })
    ) {
        libs.content.create({
            parentPath: '/',
            displayName: 'redirects',
            contentType: 'base:folder',
            data: {

            },
        });
    }
    const elements = libs.content
        .query({
            start: 0,
            count: 10000,
            contentTypes: ['base:shortcut', app.name + ':url'],
            query: '_parentPath = "/content/www.nav.no"',
        })
        .hits.reduce((t, el) => {
            if (!el.hasChildren) {
                t.push(el);
            }
            return t;
        }, []);

    socket.emit('kumax', elements.length);

    elements.forEach((el, index) => {
        socket.emit('kuvalue', index + 1);
        libs.content.move({
            source: el._path,
            target: '/redirects/',
        });
    });
}

function moveResources (socket) {
    const content = libs.content.get({
        key: '/content/nav.no-ressurser',
    });
    if (!content) {
        socket.emit('resourcesUpdate', 'Finner ikke /content/nav.no-ressurser, mulig den allerede er flyttet');
    } else {
        if (
            libs.content.move({
                source: content._path,
                target: '/www.nav.no/',
            })
        ) {
            socket.emit('resourcesUpdate', '/content/nav.no-ressurser flyttet');
        } else {
            socket.emit('resourcesUpdate', 'Feilet');
        }
    }
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

                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'p',
                            text: 'Flytt nav.no-ressurser',
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'moveResources',
                            text: 'Flytt',
                        },
                        {
                            tag: 'p',
                            update: 'resourcesUpdate',
                        },
                    ],
                },
            ],
        },
    };
}
