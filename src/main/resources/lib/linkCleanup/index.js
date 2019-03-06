var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var tools = require('/lib/tools');

exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('createLinkInfo', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                createLinkInfo(socket);
            }
        );
    });
};

function createElements() {
    return {
        isNew: true,
        head: 'Link Cleanup',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Create link info'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'link-info',
                            progress: {
                                value: 'link-info-value',
                                max: 'link-info-max',
                                valId: 'link-info-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'createLinkInfo',
                            text: 'Create'
                        }
                    ]
                }
            ]
        }
    };
}

function createLinkInfo(socket) {
    var externalLinks = content.query({
        start: 0,
        count: 10000,
        query: 'type = "no.nav.navno:Ekstern_lenke"'
    }).hits;

    socket.emit('link-info-max', externalLinks.length);

    var refMap = {};
    externalLinks.forEach(function(value, index) {
        refMap[value._id] = tools.getRefInfo(value._id);
        refMap[value._id].path = value._path;
        refMap[value._id].displayName = value.displayName;
        refMap[value._id].data = value.data;
        socket.emit('link-info-value', index + 1);
    });

    socket.emit('console.log', refMap);
}
