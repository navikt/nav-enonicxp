var contentLib = require('/lib/xp/content');
var context = require('/lib/xp/context');
var http = require('/lib/http-client');
var nodeLib = require('/lib/xp/node');
var task = require('/lib/xp/task');
var repo = nodeLib.connect({
    repoId: 'cms-repo',
    branch: 'draft',
    principals: ['role:system.admin']
});
var socket;
var elements = {
    elements: createElements()
}
exports.handle = function (s) {
    socket = s;
    var c = context.get();

    log.info(JSON.stringify(c));
    log.info(JSON.stringify(contentLib.getSite({
        key: '0bbae6ac-7e6d-4d65-a5d8-6bbe95e2f7ec'
    })));

    elements.action = [{
        id: 'lenke',
        emit: 'lenke',
        action: 'hello'
    }];
    elements.progress = [{
        id: 'lprog',
        value: 'd-Value',
        max: 'dl-childCount',
        valId: 'lprogval'
    }]
    socket.emit('newTask', elements);
    socket.on('lenke', function(action) {
        task.submit({
            description: 'Lager lenkeråterapport',
            task: function () {
                deadLinks(false, [], '');
            }
        })

    });


    var val = 0;
    var childC = 0;

    function deadLinks(el, arr, route) {
        if (!el) {
            var fnd = repo.query({
                query: '_name LIKE "linkshit"'
            }).hits[0];
            if (fnd) repo.delete(fnd._id);
            el = contentLib.get({
                key: '0bbae6ac-7e6d-4d65-a5d8-6bbe95e2f7ec'
            });
            log.info(JSON.stringify(el));
            if (!el) return log.info('Failed');
            route = 'www.nav.no'
        } else route = route + '->' + el.displayName;

        if (el.hasChildren) {
            var childs = contentLib.getChildren({
                key: el._id,
                count: 10000,
                start: 0
            }).hits;
            childC += childs.length;
            socket.emit('dl-childCount', childC);
            childs.forEach(function(child) {
                socket.emit('d-Value', ++val);
                arr = deadLinks(child, arr, route);
            });
        }
        runDeep(el.data);
        return arr;
        function runDeep(something) {

            if (typeof something === 'string') {
                var reg;
                var rx = /href=\"(.*?)\".*/g;
                while(reg = rx.exec(something)) {
                    var address = reg.pop();
                    if (!visit(address)) {

                        var find = repo.query({
                            query: '_name LIKE "linkshit"'
                        }).hits[0];
                        if (!find) {
                            repo.create({
                                _name: 'linkshit',
                                data: {
                                    shit: [{
                                        el: el._id,
                                        route: route,
                                        address: address
                                    }]
                                }
                            });
                        }
                        else {
                            find = find.id;
                            repo.modify({
                                key: find,
                                editor: function (c) {
                                    if (!Array.isArray(c.data.shit)) c.data.shit = [c.data.shit];
                                    c.data.shit.push({
                                        el: el._id,
                                        route: route,
                                        address: address
                                    })
                                    return c;
                                }
                            })
                        }


                    }


                }


            }
            else if (Array.isArray(something)) {
                something.forEach(runDeep);
            }
            else if (typeof something === 'object'){
                for (var key in something) {
                    if (something.hasOwnProperty(key)) runDeep(something[key]);
                }
            }
            //else log.info(something);
        }

    }



};


function createElements() {
    return {
        tag: '<div class="column"></div>',
        elements: [
            {
                tag: '<div class="card"></div>',
                elements: [
                    {
                       tag: '<header class="card-header"></header>',
                        elements: [
                            {
                                tag: '<p class="card-header-title is-center">Lenkeråte</p>',
                                elements: []
                            }
                        ]

                    },
                    {
                        tag: '<div class="card-content"></div>',
                        elements: [
                            {
                                tag: '<div class="content"></div>',
                                elements: [
                                    {
                                        tag: '<p>Lag en lenkeråterapport</p>',
                                        elements: []
                                    },
                                    {
                                        tag: '<progress class="progress is-info" id="lprog" value="0" max="100"></progress>',
                                        elements: []
                                    },
                                    {
                                        tag: '<p id="lprogval" class="is-center is-info"></p>',
                                        elements: []
                                    },
                                    {
                                        tag: '<button class="button is-primary" id="lenke">Start</button>',
                                        elements: []
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        tag: '<footer class="card-footer"></footer>',
                        elements: []
                    }
                ]
            }
        ]
    }
}







function visit(address) {
    var ret;
    if (address.indexOf(';') !== -1) address = address.split(";")[0];
    if (address.startsWith('content://')) {
        try {
            ret = contentLib.get({
                key: address.replace('content://', '')
            });
            return !!ret
        } catch (e) {
            return false;
        }

    }
    else if (address.startsWith('http://') || address.startsWith('https://')) {
        try {
            ret = http.request({
                url: address,
                method: 'HEAD'
            });
            return ret.status === 200
        } catch (e) {
            return false
        }

    }

    else {
        log.info(address);
        return false

    }
}