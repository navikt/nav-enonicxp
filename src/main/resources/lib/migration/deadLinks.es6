var contentLib = require('/lib/xp/content');
var context = require('/lib/xp/context');
var http = require('/lib/http-client');
var nodeLib = require('/lib/xp/node');
var task = require('/lib/xp/task');
var repo = nodeLib.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});
var socket;
var elements = createNewElements();
exports.handle = function (s) {
    socket = s;
    var tArr = [];

    elements.action = [{
        id: 'lenke',
        emit: 'lenke',
        action: 'hello',
    }];
    elements.progress = [{
        id: 'lprog',
        value: 'd-Value',
        max: 'dl-childCount',
        valId: 'lprogval',
    }];
    socket.emit('newTask', elements);
    socket.on('lenke', function (action) {
        task.submit({
            description: 'Lager lenkeråterapport',
            task: function () {
                context.run({
                    repository: 'com.enonic.cms.default',
                    branch: 'draft',
                    user: {
                        login: 'pad',
                        userStore: 'system',
                    },
                    principals: ['role:system.admin'],
                }, function () {
                    deadLinks(false, [], '');
                    var fnd = repo.query({
                        query: '_name LIKE "linkshit"',
                    }).hits[0];
                    if (fnd) { repo.delete(fnd._id); }
                    repo.create({
                        _name: 'linkshit',
                        data: {
                            shit: tArr,
                        },
                    });
                });
            },
        });
    });

    var val = 0;
    var childC = 0;

    function deadLinks (el, arr, route) {
        if (!el) {
            el = contentLib.get({
                key: '/www.nav.no',
            });

            if (!el) { return log.info('Failed'); }
            route = 'www.nav.no';
        } else { route = route + '->' + el.displayName; }
        socket.emit('dlStatusTree', 'Working in ' + route);
        if (el.hasChildren) {
            var childs = contentLib.getChildren({
                key: el._id,
                count: 10000,
                start: 0,
            }).hits;
            childC += childs.length;
            socket.emit('dl-childCount', childC);
            childs.forEach(function (child) {
                socket.emit('d-Value', ++val);
                arr = deadLinks(child, arr, route);
            });
        }
        runDeep(el.data);
        return arr;
        function runDeep (something) {
            if (typeof something === 'string') {
                var reg;
                // eslint-disable-next-line no-useless-escape
                var rx = /href=\"(.*?)\".*/g;
                // eslint-disable-next-line no-cond-assign
                while (reg = rx.exec(something)) {
                    var address = reg.pop();
                    socket.emit('dlStatus', 'Visiting: ' + address);
                    if (!visit(address)) {
                        tArr.push({
                            el: el._id,
                            route: route,
                            address: address,
                        });
                    }
                }
            } else if (Array.isArray(something)) {
                something.forEach(runDeep);
            } else if (typeof something === 'object') {
                for (var key in something) {
                    if (something.hasOwnProperty(key)) { runDeep(something[key]); }
                }
            }
            // else log.info(something);
        }
    }
};

function createNewElements () {
    return {
        isNew: true,
        head: 'Lenkeråte',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'p',
                            text: 'Lag en lenkeråterapport',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'lprog',
                            progress: {
                                value: 'd-Value',
                                max: 'dl-childCount',
                            },
                        },
                        {
                            tag: 'p',
                            status: 'dlStatusTree',
                        },
                        {
                            tag: 'p',
                            status: 'dlStatus',
                        },
                        {
                            tag: 'button',
                            tagClass: [ 'button', 'is-primary' ],
                            action: 'lenke',
                            text: 'Start',
                        },
                    ],
                },

            ],
        },
    };
}

function visit (address) {
    var ret;
    if (address.indexOf(';') !== -1) { address = address.split(';')[0]; }
    if (address.startsWith('content://')) {
        try {
            ret = contentLib.get({
                key: address.replace('content://', ''),
            });
            return !!ret;
        } catch (e) {
            return false;
        }
    } else if (address.startsWith('http://') || address.startsWith('https://')) {
        try {
            ret = http.request({
                url: address,
                method: 'HEAD',
            });
            return ret.status === 200 || (ret.status >= 300 && ret.status < 400);
        } catch (e) {
            return false;
        }
    } else if (address.startsWith('mailto') || address.startsWith('media')) { return true; } else {
        log.info(address);
        return false;
    }
}
