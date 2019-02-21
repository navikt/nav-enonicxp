var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('fiks-tavlelistene', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            fiksTavlelistene(socket);
        })

    });


};

function fiksTavlelistene(socket) {
    var alle = content.query({
        start: 0,
        count: 100000,
        contentTypes: [
            app.name + ':tavleliste'
        ]
    }).hits;
    socket.emit('fiks-tavlelistene-max', alle.length);
    alle.forEach(function (value, index) {
        socket.emit('fiks-tavlelistene-value', index + 1);
        (Array.isArray(value.data.sectionContents) ? value.data.sectionContents : [value.data.sectionContents]).forEach(function (id) {
            log.info(id);
            if (!id) {
                log.info(JSON.stringify(value, null, 4));
                return;
            }
            var val = content.get({key: id});
            if (!val) {
                return;
            }
            if (val.type === app.name + ':nav.sidebeskrivelse') {
                content.modify({
                    key: value._id,
                    editor: function(c) {
                        c.data.ingress = val.data.ingress || val.data.description;
                        if (c.data.parameters) delete c.data.parameters;
                        if (c.data.heading) delete c.data.heading;
                        return c;
                    }
                });
                try {
                    content.delete({
                        key: id
                    });
                } catch (e) {
                    log.info(e);
                }

            }
            else {
                if (val._path.indexOf('/www.nav.no/') === -1) {
                    content.move({
                        source: val._id,
                        target: value._path + '/'
                    })
                }
            }
        })
    })
}

function createElements() {
    return {
        isNew: true,
        head: 'Fiks tavlelistene',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Fiks tavlelistene'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'fiks-tavlelistene',
                            progress: {
                                value: 'fiks-tavlelistene-value',
                                max: 'fiks-tavlelistene-max',
                                valId: 'fiks-tavlelistene-progress-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fiks-tavlelistene',
                            text: 'Fiks'
                        }
                    ]
                }

            ]
        }
    }
}
