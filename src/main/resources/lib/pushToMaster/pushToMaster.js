var contentLib = require('/lib/xp/content');
var context = require('/lib/xp/context');

exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('push', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            convertFromRepoToContent(socket, 'tavleliste');
            convertFromRepoToContent(socket, 'oppslagstavle');
            var res =contentLib.publish({
                keys: ['/www.nav.no'],
                sourceBranch: 'draft',
                targetBranch: 'master',
                includeDependencies: true
            });
            if (res) socket.emit('ptmStatus', 'Success! Deleted: ' + res.deletedContents.length + ', Failed: ' + res.failedContents.length + ', Pushed: ' + res.pushedContents.length);
            else socket.emit('ptmStatus', 'Failed');
        })
    })
};

function convertFromRepoToContent(socket, type) {
    contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: [toContentType(type)]
    }).hits.forEach(function (value) {
        socket.emit('ptmStatus', 'Modifying ' + value.displayName);
        contentLib.modify({
            key: value._id,
            editor: function(c) {
                /*{
                    "ntkSelector": "true",
                    "tableSelector": "true",
                    "hasNewsElements": "false",
                    "newsSelector": "true",
                    "nrNews": 0,
                    "hasNTKElements": "true",
                    "nrNTK": 4,
                    "hasSCElements": "true",
                    "scSelector": "true",
                    "nrSC": 4
                }*/
                if (c.data.hasTableItems) delete c.data.hasTableItems;
                if (c.data.ntkSelector) delete c.data.ntkSelector;
                if (c.data.tableSelector) delete c.data.tableSelector;
                if (c.data.newsSelector) delete c.data.newsSelector;
                if (c.data.scSelector) delete c.data.scSelector;
                if (c.data.hasNewsElements) delete c.data.hasNewsElements;
                if (c.data.hasSCElements) delete c.data.hasSCElements;
                if (c.data.hasNTKElements) delete c.data.hasNTKElements;

                if (c.data.languages) {
                    if (!c.data.menuListItems) c.data.menuListItems = {
                        _selected: []
                    };
                    c.data.menuListItems._selected = Array.isArray(c.data.menuListItems._selected) ? c.data.menuListItems._selected : [c.data.menuListItems._selected]
                    c.data.menuListItems['Språkversjoner'] = {
                        link: [c.data.languages]
                    };
                    c.data.menuListItems._selected.push('Språkversjoner');
                    delete c.data.languages;
                }
               /* if (Array.isArray(c.data.heading)) {
                    c.data.heading = c.data.heading[0];
                }*/
                if (c.data.heading) delete c.data.heading;
                return c;
            }
        })
    });
}

function createElements() {
    return {
        isNew: true,
        head: '',
        preBody: true,
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: [ 'row' ],
                    elements: [
                        {
                            tag: 'button',
                            tagClass: [ 'button', 'is-success', 'is-large' ],
                            text: 'Push to master!',
                            status: 'ptmStatus',
                            action: 'push'
                        }
                    ]
                }
            ]
        }
    }
}
function toContentType(type) {
    return app.name + ':' + type;
}
