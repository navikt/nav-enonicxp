const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    node: require('/lib/xp/node'),
};

exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('move-contenthome', function () {
        libs.context.run({
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        }, function () {
            moveContentHome(socket);
        });
    });
};

function moveContentHome (socket) {
    var elemsWithContentHome = libs.content.query({
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
    elemsWithContentHome.forEach(function (value, index) {
        socket.emit('flytt-ch-value', index + 1);
        var parent = libs.content.get({
            key: value.x['no-nav-navno'].cmsContent.contentHome,
        });

        // move to parent if it's not already correct
        if (parent) {
            let newPath = parent._path + '/';
            let oldParentPath = value._path.split('/').slice(0, -1).join('/') + '/';
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
