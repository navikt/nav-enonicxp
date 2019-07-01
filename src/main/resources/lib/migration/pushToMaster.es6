const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    tools: require('/lib/migration/tools'),
};

exports.handle = function (socket) {
    const elements = createElements();
    socket.emit('newTask', elements);

    socket.on('permissionsNav', () => {
        libs.tools.runInContext(socket, (socket) => {
            setPermissions('/www.nav.no', socket);
        });
    });
    socket.on('permissionsRedirects', () => {
        libs.tools.runInContext(socket, (socket) => {
            setPermissions('/redirects', socket);
        });
    });
    socket.on('permissionsContent', () => {
        libs.tools.runInContext(socket, (socket) => {
            setPermissions('/content', socket);
        });
    });
    socket.on('push', () => {
        libs.tools.runInContext(socket, (socket) => {
            convertFromRepoToContent(socket, 'tavleliste');
            convertFromRepoToContent(socket, 'oppslagstavle');
            socket.emit('ptmStatus', 'Starts publishing');
            const res = libs.content.publish({
                keys: ['/www.nav.no'],
                sourceBranch: 'draft',
                targetBranch: 'master',
                includeDependencies: true,
            });
            if (res) {
                socket.emit(
                    'ptmStatus',
                    'Success! Deleted: ' + res.deletedContents.length + ', Failed: ' + res.failedContents.length + ', Pushed: ' + res.pushedContents.length
                );
            } else { socket.emit('ptmStatus', 'Failed'); }
        });
    });
};

function setPermissions (key, socket) {
    const p = libs.content.getPermissions({
        key: key,
    });
    let permissions = p.permissions;
    const everyone = {
        allow: ['READ'],
        deny: [],
        principal: 'role:system.everyone',
    };
    permissions = permissions.reduce((list, item) => {
        if (item.principal !== 'role:system.everyone') {
            list.push(item);
        }
        return list;
    }, []);
    permissions.push(everyone);
    socket.emit('ptmStatus', 'Setting Everyone:READ permission on ' + key + ', this might take a while');
    const ok = libs.content.setPermissions({
        key: key,
        inheritPermissions: false,
        overwriteChildPermissions: true,
        permissions: permissions,
    });

    if (ok) {
        socket.emit('ptmStatus', 'Permissions successfully set on ' + key);
    } else {
        socket.emit('ptmStatus', 'ERROR: Permissions not successfully set on ' + key);
    }
}

function convertFromRepoToContent (socket, type) {
    libs.content
        .query({
            start: 0,
            count: 1000,
            contentTypes: [toContentType(type)],
        })
        .hits.forEach((value) => {
            socket.emit('ptmStatus', 'Modifying ' + value.displayName + ' (' + value._id + ')');
            libs.content.modify({
                key: value._id,
                editor: (c) => {
                    /* {
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
                } */
                    if (c.data.hasTableItems) { delete c.data.hasTableItems; }
                    if (c.data.ntkSelector) { delete c.data.ntkSelector; }
                    if (c.data.tableSelector) { delete c.data.tableSelector; }
                    if (c.data.newsSelector) { delete c.data.newsSelector; }
                    if (c.data.scSelector) { delete c.data.scSelector; }
                    if (c.data.hasNewsElements) { delete c.data.hasNewsElements; }
                    if (c.data.hasSCElements) { delete c.data.hasSCElements; }
                    if (c.data.hasNTKElements) { delete c.data.hasNTKElements; }

                    if (c.data.languages) {
                        if (!c.data.menuListItems) {
                            c.data.menuListItems = {
                                _selected: [],
                            };
                        }
                        c.data.menuListItems._selected = Array.isArray(c.data.menuListItems._selected)
                            ? c.data.menuListItems._selected
                            : [c.data.menuListItems._selected];
                        c.data.menuListItems['Språkversjoner'] = {
                            link: [c.data.languages],
                        };
                        c.data.menuListItems._selected.push('Språkversjoner');
                        delete c.data.languages;
                    }
                    /* if (Array.isArray(c.data.heading)) {
                    c.data.heading = c.data.heading[0];
                } */
                    if (c.data.heading) { delete c.data.heading; }
                    return c;
                },
            });
        });
}

function createElements () {
    return {
        isNew: true,
        head: '',
        preBody: true,
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'card',
                    elements: [
                        {
                            tag: 'header',
                            tagClass: 'card-header',
                            elements: [
                                {
                                    tag: 'p',
                                    tagClass: 'card-header-title',
                                    text: 'Publish',
                                },
                            ],
                        },
                        {
                            tag: 'div',
                            tagClass: 'card-content',
                            elements: [
                                {
                                    tag: 'div',
                                    tagClass: ['column'],
                                    elements: [
                                        {
                                            tag: 'button',
                                            tagClass: ['button', 'is-info'],
                                            text: 'Set permissions on www.nav.no',
                                            status: 'ptmStatus',
                                            action: 'permissionsNav',
                                        },
                                    ],
                                },
                                {
                                    tag: 'div',
                                    tagClass: ['column'],
                                    elements: [
                                        {
                                            tag: 'button',
                                            tagClass: ['button', 'is-info'],
                                            text: 'Set permissions on redirects',
                                            status: 'ptmStatus',
                                            action: 'permissionsRedirects',
                                        },
                                    ],
                                },
                                {
                                    tag: 'div',
                                    tagClass: ['column'],
                                    elements: [
                                        {
                                            tag: 'button',
                                            tagClass: ['button', 'is-info'],
                                            text: 'Set permission on content',
                                            status: 'ptmStatus',
                                            action: 'permissionsContent',
                                        },
                                    ],
                                },
                                {
                                    tag: 'div',
                                    tagClass: ['column'],
                                    elements: [
                                        {
                                            tag: 'button',
                                            tagClass: ['button', 'is-success', 'is-large'],
                                            text: 'Push to master!',
                                            status: 'ptmStatus',
                                            action: 'push',
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    };
}
function toContentType (type) {
    return app.name + ':' + type;
}
