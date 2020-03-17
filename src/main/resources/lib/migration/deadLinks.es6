const libs = {
    content: require('/lib/xp/content'),
    http: require('/lib/http-client'),
    task: require('/lib/xp/task'),
    tools: require('/lib/migration/tools'),
    navUtils: require('/lib/nav-utils'),
    cache: require('/lib/siteCache'),
    unpublish: require('/lib/siteCache/invalidator'),
    officeInformation: require('/lib/officeInformation'),
};

const visitedAdresses = {};

function createNewElements() {
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
                            tagClass: ['button', 'is-primary'],
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
                            text: 'Clear and start cache',
                        },
                        {
                            tag: 'br',
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'clear-and-start-cache',
                            action: 'clearAndStartCache',
                            text: 'Clear',
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

function visit(addressParam) {
    const reasons = new Map([
        [200, ['OK', true]],
        [308, ['permanent flyttet', false]],
        [301, ['permanent flyttet', false]],
        [400, ['Serverfeil, siden ikke funnet eller tilsvarende', false]],
        ['internal', ['Innholdselementet ikke funnet internt', false]],
        ['internalError', ['Oppslag av inneholdselement feilet', false]],
        ['externalError', ['Oppslag mot ekstern lenke feilet', false]],
        ['success', ['OK', true]],
        ['error', ['Ukjent feil', false]],
    ]);
    let address = addressParam;
    const requestTemplate = {
        url: '',
        method: 'HEAD',
        connectionTimeout: 2000,
        followRedirects: false,
        readTimeout: 7000,
        // proxy: {
        //     host: 'webproxy-internett.nav.no',
        //     port: 8088,
        // },
    };

    if (address.indexOf(';') !== -1) {
        address = address.split(';')[0];
    }
    if (address.startsWith('content://') || address.startsWith('media')) {
        // internal links
        try {
            let contentKey = address.replace('content://', '');
            contentKey = contentKey.replace('media://download/', '');
            contentKey = contentKey.replace('media://', '');
            const result = libs.content.get({
                key: contentKey,
            });
            return !result ? reasons.get('internal') : reasons.get('success');
        } catch (e) {
            return reasons.get('internalError');
        }
    } else if (address.startsWith('http://') || address.startsWith('https://')) {
        // external links
        try {
            const result = libs.http.request({ ...requestTemplate, url: address });
            const reason = reasons.get(result.status);
            return reason || result.status > 400 ? result.get(400) : reason.get('error');
        } catch (e) {
            log.info(`failed httpRequest for ${address}`);
            log.info(JSON.stringify(e, null, 4));

            return reasons.get('error');
        }
    } else if (address.startsWith('/')) {
        // check relative urls
        let result = libs.content.get({
            key: address,
        });
        if (!result) {
            // if not content check if it on a sub domain of nav.no
            try {
                address = 'https://www.nav.no' + address;
                result = libs.http.request({ ...requestTemplate, url: address });

                const reason = reasons.get(result.status);
                return reason || result.status > 400 ? result.get(400) : reason.get('error');
            } catch (e) {
                log.info(`failed httpRequest for ${address}`);
                log.info(JSON.stringify(e, null, 4));

                return reasons.get('error');
            }
        }
    } else if (address.startsWith('mailto')) {
        // mail
        return reasons.get('success');
    }
    return reasons.get('error');
}
let deadLinksCurrentIndex = 0;
let deadLinksMaxCount = 0;

function runDeep(something, deadLinksFound, socket, el) {
    if (typeof something === 'string') {
        // eslint-disable-next-line no-useless-escape
        const guidRegex = /^(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}$/g;
        // if the string is a contentId
        if (guidRegex.exec(something)) {
            // TODO: rewrite this skipping better, maybe use returns
            // const exists = !!libs.content.get({
            //     key: something,
            // });
            // if (!exists) {
            //     deadLinksFound.push({
            //         path: el._path,
            //         address: something,
            //         linktext: 'isRef',
            //     });
            // }
        } else {
            let reg;
            // eslint-disable-next-line no-useless-escape
            const rx = /href="([^"]+)"?[^>]*([^<]+)<\/a>/g;
            // eslint-disable-next-line no-cond-assign
            while ((reg = rx.exec(something)) !== null) {
                const address = reg[1].trim().toLowerCase();
                const linktext = reg[2].substring(1);
                let reason = '';
                let isAlive = false;
                if (visitedAdresses[address] === undefined) {
                    socket.emit('dlStatus', 'Visiting: ' + address);
                    // with external links should also include status code
                    [reason, isAlive] = visit(address);
                    visitedAdresses[address] = isAlive;
                }

                if (!visitedAdresses[address]) {
                    deadLinksFound.push({
                        path: el._path,
                        address: address,
                        linktext: linktext,
                        reason,
                    });
                }
            }
        }
    } else if (Array.isArray(something)) {
        something.forEach(s => runDeep(s, deadLinksFound, socket, el));
    } else if (typeof something === 'object') {
        Object.keys(something).forEach(key => runDeep(something[key], deadLinksFound, socket, el));
    }
}
function deadLinks(el, deadLinksFound, socket) {
    socket.emit('dlStatusTree', 'Working in ' + el._path);

    runDeep(el.data, deadLinksFound, socket, el);
    deadLinksCurrentIndex += 1;
    socket.emit('d-Value', deadLinksCurrentIndex);

    // find all children and check for dead links on those
    const children = libs.navUtils.getAllChildren(el);
    deadLinksMaxCount += children.length;
    socket.emit('dl-childCount', deadLinksMaxCount);
    children.forEach(child => {
        deadLinks(child, deadLinksFound, socket);
    });
}

function handleDeadLinks(socket) {
    // reset counters
    deadLinksCurrentIndex = 0;
    deadLinksMaxCount = 2;

    const deadLinksFound = [];
    deadLinks(
        libs.content.get({
            key: '/www.nav.no',
        }),
        deadLinksFound,
        socket
    );
    deadLinks(
        libs.content.get({
            key: '/redirects',
        }),
        deadLinksFound,
        socket
    );
    const navRepo = libs.tools.getNavRepo();
    const deadLinksNode = navRepo.get('/deadlinks');
    if (deadLinksNode) {
        navRepo.delete(deadLinksNode._id);
    }

    navRepo.create({
        _name: 'deadlinks',
        parentPath: '/',
        data: {
            links: deadLinksFound,
        },
    });
}

function dumpDeadlinks(socket) {
    const navRepo = libs.tools.getNavRepo();
    const deadlinks = navRepo.get('/deadlinks').data.links;
    let csv = 'Path,Feilende url,Lenketekst,Begrunnelse\r\n';
    deadlinks.forEach(l => {
        csv += `${l.path.substring(1)},${l.address},${l.linktext},${l.reason}\r\n`;
    });
    const file = {
        content: csv,
        type: 'text/csv',
        name: 'deadLinks.csv',
    };
    socket.emit('downloadFile', file);
}

const elements = createNewElements();
exports.handle = s => {
    const socket = s;

    elements.action = [
        {
            id: 'lenke',
            emit: 'lenke',
            action: 'hello',
        },
    ];
    elements.progress = [
        {
            id: 'lprog',
            value: 'd-Value',
            max: 'dl-childCount',
            valId: 'lprogval',
        },
    ];
    socket.emit('newTask', elements);
    socket.on('lenke', () => {
        libs.task.submit({
            description: 'Lager lenkeråterapport',
            task: () => {
                libs.tools.runInMasterContext(socket, handleDeadLinks);
            },
        });
    });

    socket.on('clearAndStartCache', () => {
        libs.tools.runInContext(socket, () => {
            libs.cache.activateEventListener();
            libs.unpublish.start();
            libs.officeInformation.startCronJob();
        });
    });

    socket.on('dumpDeadlinks', () => {
        libs.tools.runInContext(socket, dumpDeadlinks);
    });
};
