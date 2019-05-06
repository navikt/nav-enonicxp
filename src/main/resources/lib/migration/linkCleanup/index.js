var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var tools = require('/lib/tools');

exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);

    socket.on('createLinkInfo', function() {
        context.run(
            {
                repository: 'com.enonic.cms.default',
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

    var urls = content.query({
        start: 0,
        count: 1000,
        query: 'type = "no.nav.navno:url"'
    }).hits;

    socket.emit('link-info-max', externalLinks.length + urls.length);

    var refMap = {};
    var urlRefMap = {};
    var urlInfo = {};
    var urlInfo2 = {};
    externalLinks.forEach(function(value, index) {
        refMap[value._id] = tools.getRefInfo(value._id);
        refMap[value._id].path = value._path;
        refMap[value._id].displayName = value.displayName;
        refMap[value._id].data = value.data;

        if (value.data && value.data.url) {
            urlInfo[value._id] = tools.getIdFromUrl(value.data.url);
            urlInfo[value._id].url = value.data.url;
            urlInfo[value._id].path = value._path;
        }

        urlInfo[value._id].url = value.data.url;
        socket.emit('link-info-value', index + 1);
    });

    socket.emit('console.log', refMap);
    socket.emit('console.log', urlInfo);

    urls.forEach(function(value, index) {
        urlRefMap[value._id] = tools.getRefInfo(value._id);
        urlRefMap[value._id].path = value._path;
        urlRefMap[value._id].displayName = value.displayName;
        urlRefMap[value._id].data = value.data;

        if (value.data && value.data.url) {
            urlInfo2[value._id] = tools.getIdFromUrl(value.data.url);
            urlInfo2[value._id].url = value.data.url;
            urlInfo2[value._id].path = value._path;
        }

        socket.emit('link-info-value', externalLinks.length + index + 1);
    });

    socket.emit('console.log', urlRefMap);
    socket.emit('console.log', urlInfo2);
}

function convertUrlToShortcut(socket) {
    var urls = content.query({
        start: 0,
        count: 1000,
        query: 'type = "no.nav.navno:url"'
    }).hits;

    urls.forEach(function(value, index) {
        if (value.data && value.data.url) {
            var idInfo = tools.getIdFromUrl(value.data.url);
            if (!idInfo.external && !idInfo.invalid && value.path.indexOf('/redirects/') === 0) {
                // TODO convert url to shortcut
            }
        }
    });
}
