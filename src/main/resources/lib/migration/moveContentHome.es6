const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    node: require('/lib/xp/node'),
    tools: require('/lib/migration/tools'),
};

exports.handle = function (socket) {
    const elements = createElements();
    socket.emit('newTask', elements);
    socket.on('move-contenthome', () => {
        libs.tools.runInContext(socket, moveContentHome);
    });
};

function moveContentHome (socket) {
    const elemsWithContentHome = libs.content.query({
        start: 0,
        count: 100000,
        query: '_parentpath LIKE "/*"',
        filters: {
            exists: {
                field: 'x.no-nav-navno.cmsContent.contentHome',
            },
        },
    }).hits;
    socket.emit('flytt-ch-max', elemsWithContentHome.length);

    elemsWithContentHome.forEach((value, index) => {
        socket.emit('flytt-ch-value', index + 1);
        const parent = libs.content.get({
            key: value.x['no-nav-navno'].cmsContent.contentHome,
        });

        // move to parent if it's not already correct
        if (parent) {
            const newPath = parent._path + '/';
            const oldParentPath = value._path.split('/').slice(0, -1).join('/') + '/';
            if (newPath !== oldParentPath) {
                try {
                    libs.content.move({
                        source: value._id,
                        target: parent._path + '/',
                    });
                } catch (e) {
                    log.info(e.message);
                    log.info(parent._path + ' ' + value._path.replace('/' + value._name, ''));
                    log.info(value._path);
                }
            }
        }
    });
}
function createElements () {
    return {
        isNew: true,
        head: 'Flytt til content home',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Flytt til content home',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'flytt-ch',
                            progress: {
                                value: 'flytt-ch-value',
                                max: 'flytt-ch-max',
                                valId: 'flytt-ch-val',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'move-contenthome',
                            text: 'Fjern',
                        },

                    ],
                },
            ],
        },
    };
}
