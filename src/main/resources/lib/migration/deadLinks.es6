const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    http: require('/lib/http-client'),
    node: require('/lib/xp/node'),
    task: require('/lib/xp/task'),
    tools: require('/lib/migration/tools'),
};
let socket;
const elements = createNewElements();
exports.handle = (s) => {
    socket = s;

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
                libs.tools.runInContext(socket, handleDeadLinks);
            },
        });
    });

    socket.on('findOldFormLinks', () => {
        libs.tools.runInContext(socket, findOldFormLinks);
    });

    socket.on('dumpDeadlinks', () => {
        libs.tools.runInContext(socket, dumpDeadlinks);
    });
};

let val = 0;
let childC = 0;
let tArr = [];
function handleDeadLinks (socket) {
    // reset counters
    val = 0;
    childC = 0;
    tArr = [];

    deadLinks(false, [], '', socket);

    const navRepo = libs.tools.getNavRepo();
    const fnd = navRepo.get('/deadlinks');
    if (fnd) {
        navRepo.delete(fnd._id);
    }
    navRepo.create({
        _name: 'deadlinks',
        parentPath: '/',
        data: {
            links: tArr,
        },
    });
}

function deadLinks (el, arr, route, socket) {
    if (!el) {
        el = libs.content.get({
            key: '/www.nav.no',
        });

        if (!el) {
            return log.info('Failed');
        }
        route = 'www.nav.no';
    } else {
        route = route + '->' + el.displayName;
    }
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
            arr = deadLinks(child, arr, route, socket);
        });
    }
    runDeep(el.data, socket);
    return arr;

    function runDeep (something, socket) {
        if (typeof something === 'string') {
            let reg;
            // eslint-disable-next-line no-useless-escape
            const rx = /href="([^"]+)"?[^>]*([^<]+)<\/a>/g;
            // eslint-disable-next-line no-cond-assign
            while ((reg = rx.exec(something)) !== null) {
                const address = reg[1];
                const linktext = reg[2].substring(1);
                socket.emit('dlStatus', 'Visiting: ' + address);
                if (!visit(address)) {
                    tArr.push({
                        path: el._path,
                        address: address,
                        linktext: linktext
                    });
                }
            }
        } else if (Array.isArray(something)) {
            something.forEach((s) => runDeep(s, socket));
        } else if (typeof something === 'object') {
            for (let key in something) {
                if (something.hasOwnProperty(key)) {
                    runDeep(something[key], socket);
                }
            }
        }
        // else log.info(something);
    }
}

function dumpDeadlinks () {
    const navRepo = libs.tools.getNavRepo();
    const deadlinks = navRepo.get('/deadlinks').data.links;
    let csv = 'Path,Feilende url,Lenketekst\r\n';
    deadlinks.forEach((l) => {
        csv += `${l.path.substring(1)},${l.address},${l.linktext}\r\n`;
    });
    const file = {
        content: csv,
        type: 'text/csv',
        name: 'deadLinks.csv'
    }
    socket.emit('downloadFile', file)
}

function findOldFormLinks (socket) {
    let csv = 'Url;Skjema Id;Skjema Navn;Språk;Type\r\n';
    const contentWithForms = libs.content.query({
        start: 0,
        count: 10000,
        query: 'data.menuListItems.form-and-application.link LIKE "*"',
    }).hits;

    socket.emit('find-old-form-links-max', contentWithForms.length);
    contentWithForms.forEach((c, index) => {
        let formLinks = c.data.menuListItems['form-and-application'].link;
        formLinks = formLinks ? Array.isArray(formLinks) ? formLinks : [formLinks] : [];
        formLinks.forEach(link => {
            const linkContent = libs.content.get({
                key: link,
            });
            if (linkContent && linkContent.data && linkContent.data.number) {
                csv += `https://${c._path.replace('/www.nav.no', 'www-x4.nav.no')};${linkContent.data.number};${linkContent.displayName};${c.language};${linkContent.type}\r\n`;
            }
        });
        socket.emit('find-old-form-links-value', index + 1);
    });

    socket.emit('console.log', csv);
}

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
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider'],
                        },
                    ],
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Dump deadlinks csv',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'dump-deadlinks',
                            progress: {
                                value: 'dump-deadlinks-value',
                                max: 'dump-deadlinks-max',
                                valId: 'dump-deadlinks-val-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'dump-deadlinks-button',
                            action: 'dumpDeadlinks',
                            text: 'dump',
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider'],
                        },
                    ],
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Find old form links',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'find-old-form-links',
                            progress: {
                                value: 'find-old-form-links-value',
                                max: 'find-old-form-links-max',
                                valId: 'find-old-form-links-val-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'find-old-form-links-button',
                            action: 'findOldFormLinks',
                            text: 'Find',
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider'],
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
    if (address.startsWith('content://') || address.startsWith('media')) {
        try {
            let contentKey = address.replace('content://', '')
            contentKey = contentKey.replace('media://', '')
            ret = libs.content.get({
                key: contentKey,
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
                connectionTimeout: 2000,
                readTimeout: 7000
            });
            return ret.status === 200 || (ret.status >= 300 && ret.status < 400);
        } catch (e) {
            return false;
        }
    } else if (address.startsWith('mailto')) {
        return true;
    }
    else {
        log.info(address);
        return false;
    }
}
