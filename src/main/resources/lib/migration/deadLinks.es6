const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    http: require('/lib/http-client'),
    node: require('/lib/xp/node'),
    task: require('/lib/xp/task'),
    tools: require('/lib/migration/tools'),
    navUtils: require('/lib/nav-utils'),
    cache: require('/lib/siteCache'),
    unpublish: require('/lib/siteCache/invalidator'),
    officeInformation: require('/lib/officeInformation'),
    templates: require('/lib/migration/templates'),
};

let socket;
const elements = createNewElements();
exports.handle = s => {
    socket = s;

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
    socket.on('templates', () => {
        libs.task.submit({
            description: 'Lager templates',
            task: () => {
                libs.tools.runInMasterContext(socket, libs.templates.handle);
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

    // socket.on('findOldFormLinks', () => {
    //     libs.tools.runInContext(socket, findOldFormLinks);
    // });

    socket.on('dumpDeadlinks', () => {
        libs.tools.runInContext(socket, dumpDeadlinks);
    });

    // socket.on('findDuplicateChapters', () => {
    //     libs.tools.runInContext(socket, findDuplicateChapters);
    // });
};

let deadLinksCurrentIndex = 0;
let deadLinksMaxCount = 0;
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

function deadLinks(el, deadLinksFound, socket) {
    socket.emit('dlStatusTree', 'Working in ' + el._path);

    runDeep(el.data, deadLinksFound, socket);
    deadLinksCurrentIndex += 1;
    socket.emit('d-Value', deadLinksCurrentIndex);

    // find all children and check for dead links on those
    const children = libs.navUtils.getAllChildren(el);
    deadLinksMaxCount += children.length;
    socket.emit('dl-childCount', deadLinksMaxCount);
    children.forEach(child => {
        deadLinks(child, deadLinksFound, socket);
    });

    function runDeep(something, deadLinksFound, socket) {
        if (typeof something === 'string') {
            // eslint-disable-next-line no-useless-escape
            const guidRegex = /^(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}$/g;
            if (guidRegex.exec(something)) {
                const exists = !!libs.content.get({
                    key: something,
                });
                if (!exists) {
                    deadLinksFound.push({
                        path: el._path,
                        address: something,
                        linktext: 'isRef',
                    });
                }
            } else {
                let reg;
                // eslint-disable-next-line no-useless-escape
                const rx = /href="([^"]+)"?[^>]*([^<]+)<\/a>/g;
                // eslint-disable-next-line no-cond-assign
                while ((reg = rx.exec(something)) !== null) {
                    const address = reg[1];
                    const linktext = reg[2].substring(1);
                    socket.emit('dlStatus', 'Visiting: ' + address);
                    if (!visit(address)) {
                        deadLinksFound.push({
                            path: el._path,
                            address: address,
                            linktext: linktext,
                        });
                    }
                }
            }
        } else if (Array.isArray(something)) {
            something.forEach(s => runDeep(s, deadLinksFound, socket));
        } else if (typeof something === 'object') {
            for (let key in something) {
                if (something.hasOwnProperty(key)) {
                    runDeep(something[key], deadLinksFound, socket);
                }
            }
        }
    }
}

function dumpDeadlinks() {
    const navRepo = libs.tools.getNavRepo();
    const deadlinks = navRepo.get('/deadlinks').data.links;
    let csv = 'Path,Feilende url,Lenketekst\r\n';
    deadlinks.forEach(l => {
        csv += `${l.path.substring(1)},${l.address},${l.linktext}\r\n`;
    });
    const file = {
        content: csv,
        type: 'text/csv',
        name: 'deadLinks.csv',
    };
    socket.emit('downloadFile', file);
}

function findOldFormLinks(socket) {
    let csv = 'Url;Skjema Id;Skjema Navn;Språk;Type\r\n';
    const contentWithForms = libs.content.query({
        start: 0,
        count: 10000,
        query: 'data.menuListItems.form-and-application.link LIKE "*"',
    }).hits;

    socket.emit('find-old-form-links-max', contentWithForms.length);
    contentWithForms.forEach((c, index) => {
        let formLinks = c.data.menuListItems['form-and-application'].link;
        formLinks = formLinks ? (Array.isArray(formLinks) ? formLinks : [formLinks]) : [];
        formLinks.forEach(link => {
            const linkContent = libs.content.get({
                key: link,
            });
            if (linkContent && linkContent.data && linkContent.data.number) {
                csv += `https://${c._path.replace('/www.nav.no', 'www-x4.nav.no')};${
                    linkContent.data.number
                };${linkContent.displayName};${c.language};${linkContent.type}\r\n`;
            }
        });
        socket.emit('find-old-form-links-value', index + 1);
    });

    socket.emit('console.log', csv);
}

function findDuplicateChapters(socket) {
    const chapters = libs.content.query({
        start: 0,
        count: 10000,
        query: `type = "${app.name}:main-article-chapter"`,
    }).hits;
    const chapterArticles = chapters.reduce((list, chapter) => {
        const hasArticle = list.filter(a => a._id === chapter.data.article).length > 0;
        if (!hasArticle) {
            list.push(
                libs.content.get({
                    key: chapter.data.article,
                })
            );
        }
        return list;
    }, []);
    socket.emit('find-duplicate-chapters-max', chapterArticles.length);
    const allDuplicates = [];
    let count = 0;
    for (let i = 0; i < chapterArticles.length - 1; i += 1) {
        const duplicates = [];
        for (let k = i + 1; k < chapterArticles.length; k += 1) {
            const article1 = chapterArticles[i];
            const article2 = chapterArticles[k];
            if (
                article1._id !== article2._id &&
                article1.displayName === article2.displayName &&
                article1.ingress === article2.ingress &&
                article1.text === article2.text
            ) {
                if (duplicates.length === 0) {
                    duplicates.push(article1);
                }
                duplicates.push(article2);
            }
        }
        if (duplicates.length > 0) {
            duplicates.forEach(d => {
                chapterArticles.splice(chapterArticles.indexOf(d), 1);
                count += 1;
            });
            allDuplicates.push(duplicates);
        } else {
            count += 1;
        }
        socket.emit('find-duplicate-chapters-value', count);
    }

    let csv = 'DisplayName;Path;UsedBy\r\n';
    allDuplicates.forEach(duplicates => {
        duplicates.forEach((article, index) => {
            if (index === 0) {
                csv += article.displayName + ';';
            } else {
                csv += ';';
            }

            csv += article._path + ';';
            const usedBy = libs.content.query({
                start: 0,
                count: 100,
                query: `_references = "${article._id}"`,
            }).hits;
            usedBy.forEach((u, usedByIndex) => {
                if (usedByIndex > 0) {
                    csv += '\r\n;;';
                }
                csv += u._path;
            });

            csv += '\r\n';
        });
    });

    const file = {
        content: csv,
        type: 'text/csv',
        name: 'duplicateChapters.csv',
    };
    socket.emit('downloadFile', file);
}

function createNewElements() {
    return {
        isNew: true,
        head: 'nav.no Actions',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'p',
                            text: 'Lag templates på nytt',
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
                            action: 'templates',
                            text: 'Templates',
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider'],
                        },
                    ],
                },
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
                // {
                //     tag: 'div',
                //     tagClass: 'row',
                //     elements: [
                //         {
                //             tag: 'span',
                //             text: 'Find old form links',
                //         },
                //         {
                //             tag: 'progress',
                //             tagClass: ['progress', 'is-info'],
                //             id: 'find-old-form-links',
                //             progress: {
                //                 value: 'find-old-form-links-value',
                //                 max: 'find-old-form-links-max',
                //                 valId: 'find-old-form-links-val-id',
                //             },
                //         },
                //         {
                //             tag: 'button',
                //             tagClass: ['button', 'is-info'],
                //             id: 'find-old-form-links-button',
                //             action: 'findOldFormLinks',
                //             text: 'Find',
                //         },
                //         {
                //             tag: 'li',
                //             tagClass: ['navbar-divider'],
                //         },
                //     ],
                // },
                // {
                //     tag: 'div',
                //     tagClass: 'row',
                //     elements: [
                //         {
                //             tag: 'span',
                //             text: 'Find duplicate chapters',
                //         },
                //         {
                //             tag: 'progress',
                //             tagClass: ['progress', 'is-info'],
                //             id: 'find-duplicate-chapters',
                //             progress: {
                //                 value: 'find-duplicate-chapters-value',
                //                 max: 'find-duplicate-chapters-max',
                //                 valId: 'find-duplicate-chapters-id',
                //             },
                //         },
                //         {
                //             tag: 'button',
                //             tagClass: ['button', 'is-info'],
                //             id: 'find-duplicate-chapters-button',
                //             action: 'findDuplicateChapters',
                //             text: 'Find',
                //         },
                //         {
                //             tag: 'li',
                //             tagClass: ['navbar-divider'],
                //         },
                //     ],
                // },
            ],
        },
    };
}

function visit(address) {
    address = address.trim();
    let ret;
    if (address.indexOf(';') !== -1) {
        address = address.split(';')[0];
    }
    if (address.startsWith('content://') || address.startsWith('media')) {
        try {
            let contentKey = address.replace('content://', '');
            contentKey = contentKey.replace('media://download/', '');
            contentKey = contentKey.replace('media://', '');
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
                readTimeout: 7000,
            });
            return ret.status === 200 || (ret.status >= 300 && ret.status < 400);
        } catch (e) {
            return false;
        }
    } else if (address.startsWith('mailto')) {
        return true;
    } else {
        log.info(address);
        return false;
    }
}
