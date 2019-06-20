const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    http: require('/lib/xp/http-client'),
    node: require('/lib/xp/node'),
    task: require('/lib/xp/task'),
    tools: require('/lib/migration/tools'),
};
const repo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});
let socket;
const elements = createNewElements();
exports.handle = function (s) {
    socket = s;
    const tArr = [];

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
    socket.on('lenke', () => {
        libs.task.submit({
            description: 'Lager lenkeråterapport',
            task: () => {
                libs.tools.runInContext(socket, () => {
                    deadLinks(false, [], '');
                    const fnd = repo.query({
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

    let val = 0;
    let childC = 0;

    function deadLinks (el, arr, route) {
        if (!el) {
            el = libs.content.get({
                key: '/www.nav.no',
            });

            if (!el) { return log.info('Failed'); }
            route = 'www.nav.no';
        } else { route = route + '->' + el.displayName; }
        socket.emit('dlStatusTree', 'Working in ' + route);
        if (el.hasChildren) {
            const childs = libs.content.getChildren({
                key: el._id,
                count: 10000,
                start: 0,
            }).hits;
            childC += childs.length;
            socket.emit('dl-childCount', childC);
            childs.forEach((child) => {
                socket.emit('d-Value', ++val);
                arr = deadLinks(child, arr, route);
            });
        }
        runDeep(el.data);
        return arr;

        function runDeep (something) {
            if (typeof something === 'string') {
                let reg;
                // eslint-disable-next-line no-useless-escape
                const rx = /href=\"(.*?)\".*/g;
                // eslint-disable-next-line no-cond-assign
                while (reg = rx.exec(something)) {
                    const address = reg.pop();
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
                for (let key in something) {
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
    let ret;
    if (address.indexOf(';') !== -1) { address = address.split(';')[0]; }
    if (address.startsWith('content://')) {
        try {
            ret = libs.content.get({
                key: address.replace('content://', ''),
            });
            return !!ret;
        } catch (e) {
            return false;
        }
    } else if (address.startsWith('http://') || address.startsWith('https://')) {
        try {
            ret = libs.http.request({
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
