var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var node = require('/lib/xp/node');
var value = require('/lib/xp/value');

exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('convertStringToDateTime', function() {
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
                convertStringToDateTime(socket);
            }
        );
    });
};

var totalCount = 0;
var currentCount = 0;
function convertStringToDateTime(socket) {
    totalCount = 0;
    currentCount = 0;
    var repo = node.connect({
        repoId: 'cms-repo',
        branch: 'draft',
        principals: ['role:system.admin']
    });
    var startElems = ['/content/www.nav.no', '/content/content', '/content/redirects'];
    convert(repo, socket, startElems);
}

function convert(repo, socket, elems) {
    totalCount += elems.length;
    socket.emit('convert-string-to-datetime-max', totalCount);
    elems.forEach(function(key) {
        log.info(key);
        currentCount += 1;
        socket.emit('convert-string-to-datetime-value', currentCount);
        repo.modify({
            key: key,
            editor: function(elem) {
                elem.modifiedTime = value.instant(elem.modifiedTime);
                elem.createdTime = value.instant(elem.createdTime);
                if (elem.publish) {
                    if (elem.publish.first) {
                        elem.publish.first = value.instant(elem.publish.first);
                    }
                    if (elem.publish.from) {
                        elem.publish.from = value.instant(elem.publish.from);
                    }
                    if (elem.publish.to) {
                        elem.publish.to = value.instant(elem.publish.to);
                    }
                }
                return elem;
            }
        });

        var children = repo
            .findChildren({
                start: 0,
                count: 5000,
                parentKey: key
            })
            .hits.map(function(c) {
                return c.id;
            });

        if (children.length > 0) {
            convert(repo, socket, children);
        }
    });
}

function createElements() {
    return {
        isNew: true,
        head: 'DateTime fix',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'String => DateTime'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'convert-string-to-datetime',
                            progress: {
                                value: 'convert-string-to-datetime-value',
                                max: 'convert-string-to-datetime-max',
                                valId: 'convert-string-to-datetime-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'convertStringToDateTime',
                            text: 'Convert'
                        }
                    ]
                }
            ]
        }
    };
}
