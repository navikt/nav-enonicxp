var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('move-contenthome', function () {
        context.run({
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            moveContenthome(socket);
        })

    });


};

function moveContenthome(socket) {
    var alle = content.query({
        start: 0,
        count: 100000,
        query: '_parentpath LIKE "/*"',
        filters: {
            exists: {
                field: 'x.no-nav-navno.cmsContent.contentHome'
            }
        }
    });
    socket.emit('flytt-ch-max', alle.hits.length);
    alle.hits.forEach(function (value, index) {
        socket.emit('flytt-ch-value', index +1);
        var p = content.get({ key: value.x['no-nav-navno'].cmsContent.contentHome });
        if (p && p._path !== value._path.substring(0,value._path.length - (value._name.length + 1))) {
           try {
               content.move({
                   source: value._id,
                   target: p._path + '/'
               })
           } catch (e) {
               log.info(p._path + ' ' + value._path.replace('/' + value._name, ''))
               log.info(value._path);
           }
           // log.info(p._path + ' ' + value._path.substring(0, value._path.length - (value._name.length + 1)));
        }
    })
}
function createElements() {
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
                            text: 'Flytt til content home'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'flytt-ch',
                            progress: {
                                value: 'flytt-ch-value',
                                max: 'flytt-ch-max',
                                valId: 'flytt-ch-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'move-contenthome',
                            text: 'Fjern'
                        }

                    ]
                }
            ]
        }
    }
}
