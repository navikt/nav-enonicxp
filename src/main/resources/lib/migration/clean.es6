const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    tools: require('/lib/migration/tools'),
};

exports.handle = function (socket) {
    const elements = createElements();
    socket.emit('newTask', elements);

    socket.on('fjern-old', () => {
        libs.tools.runInContext(socket, fjernOld);
    });
    socket.on('fjern-nyheter', () => {
        libs.tools.runInContext(socket, fjernNyheter);
    });
    socket.on('fjern-pressemeldinger', () => {
        libs.tools.runInContext(socket, fjernPressemeldinger);
    });
    socket.on('fjern-nyheter-brukerportal', () => {
        libs.tools.runInContext(socket, fjernNyheterBrukerPortal);
    });
    socket.on('fjern-non-approved', () => {
        libs.tools.runInContext(socket, fjernNonApproved);
    });
    socket.on('remove-empty-folders', () => {
        libs.tools.runInContext(socket, removeEmptyFolders);
    });
    socket.on('remove-enhetsinformasjon', () => {
        libs.tools.runInContext(socket, removeEnhetsinformasjon);
    });
};

function removeEmptyFolders (socket) {
    const folders = libs.content.query({
        start: 0,
        count: 5000,
        query: 'type = "base:folder" AND _state NOT LIKE "PENDING_DELETE"',
    }).hits;

    socket.emit('remove-empty-folders-max', folders.length);
    let anyDeletions = false;
    folders.forEach((folder, index) => {
        if (folder.hasChildren === false) {
            libs.content.delete({
                key: folder._id,
            });
            anyDeletions = true;
            log.info('deleted : ' + folder._id + ' (' + folder._path + ')');
        }
        socket.emit('remove-empty-folders-value', index + 1);
    });

    // if this is logged, it should run again
    if (anyDeletions) {
        log.info('try again');
    }
}

function fjernNonApproved (socket) {
    const nonApproved = libs.content.query({
        start: 0,
        count: 90000,
        filters: {
            boolean: {
                must: {
                    exists: {
                        field: 'x.no-nav-navno.cmsStatus',
                    },
                },
                mustNot: {
                    hasValue: {
                        field: 'x.no-nav-navno.cmsStatus.status',
                        values: ['approved'],
                    },
                },
            },
        },
    });
    socket.emit('fjern-non-approved-max', nonApproved.hits.length);
    nonApproved.hits.forEach((value, index) => {
        socket.emit('fjern-non-approved-value', index + 1);
        let contentKey;
        if (
            value.hasOwnProperty('x') &&
            value.x.hasOwnProperty('no-nav-navno') &&
            value.x['no-nav-navno'].hasOwnProperty('cmsContent') &&
            value.x['no-nav-navno'].cmsContent.hasOwnProperty('contentKey')
        ) {
            contentKey = value.x['no-nav-navno'].cmsContent.contentKey;
        } else {
            log.info(JSON.stringify(value, 4, null));
        }
        const cmsContent = libs.content.query({
            start: 0,
            count: 10000,
            query: 'data.parameters.value = "' + contentKey + '"',
        }).hits;
        if (cmsContent.length > 0) {
            cmsContent.forEach((v) => {
                libs.content.delete({
                    key: v._id,
                });
            });
        }
        libs.content.delete({
            key: value._id,
        });
        // log.info(JSON.stringify([cmsContent, value], null, 4));
    });
}
function fjernNyheterBrukerPortal (socket) {
    const res = libs.content.query({
        start: 0,
        count: 100000,
        contentTypes: [app.name + ':Nyhet_brukerportal'],
    });
    socket.emit('fjern-nyheter-brukerportal-max', res.total);
    res.hits.forEach((value, index) => {
        socket.emit('fjern-nyheter-brukerportal-value', index + 1);
        libs.content.delete({
            key: value._id,
        })
            ? log.info('Removed ' + value._path)
            : log.info('Failed to remove ' + value._path);
    });
}

function fjernPressemeldinger (socket) {
    const res = libs.content.query({
        start: 0,
        count: 100000,
        query: 'modifiedTime < instant("2018-01-01T00:00:00.00Z")',
        contentTypes: [app.name + ':nav.pressemelding'],
    });

    socket.emit('fjern-pressemeldinger-max', res.hits.length);
    res.hits.forEach((element, index) => {
        socket.emit('fjern-pressemeldinger-value', index + 1);
        libs.content.delete({
            key: element._id,
        })
            ? log.info('Removed ' + element._path)
            : log.info('Failed to remove ' + element._path);
    });
}

function fjernOld (socket) {
    const pathsToRemove = [
        'oppfolging',
        'inspirasjon',
        'njava',
        'appressurser-teknisk-site',
        'www.nav.no-old',
        'uforeveileder',
        'kommunenavet',
        'xbilder-navet',
        'xnavet',
        'rettskildene-intern',
        // 'skjemaveileder',
        'kampanjer',
        // 'skjemaer',
        'emneord',
        'kontaktinformasjon',
        'rettskildene-ekstern',
        'bilder-felles-nav.no-og-navet',
        'sprak',
        'selvbetjening',
        'satser-og-datoer',
        'bilder-nav.no',
        'nav.no-lokalt/fylke/arkiv-fylkessider',
        'nav.no-lokalt/arbeidslivssenter/arkiv-arbeidslivssider',
    ];
    socket.emit('fjern-old-max', pathsToRemove.length);
    pathsToRemove.forEach((value, index) => {
        socket.emit('fjern-old-value', index + 1);
        libs.content.delete({
            key: '/content/' + value,
        });
    });
}

function fjernNyheter (socket) {
    const res = libs.content.query({
        start: 0,
        count: 100000,
        query: 'modifiedTime < instant("2018-01-01T00:00:00.00Z")',
        contentTypes: [app.name + ':nav.nyhet'],
    });

    socket.emit('fjern-nyheter-max', res.hits.length);
    res.hits.forEach((element, index) => {
        socket.emit('fjern-nyheter-value', index + 1);
        libs.content.delete({
            key: element._id,
        })
            ? log.info('Removed ' + element._path)
            : log.info('Failed to remove ' + element._path);
    });
}

function removeEnhetsinformasjon (socket) {
    const hits = libs.content.query({
        start: 0,
        count: 1000,
        query: `type = "${app.name}:Enhetsinformasjon"`,
    }).hits;

    socket.emit('remove-enhetsinformasjon-max', hits.length);
    hits.forEach((enhet, index) => {
        libs.content.delete({
            key: enhet._id,
        });
        socket.emit('remove-enhetsinformasjon-value', index + 1);
    });

    // delete old cms2xpSection
    libs.content.delete({
        key: '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontakt-oss/kontorer',
    });

    // create new folder instead
    libs.content.create({
        displayName: 'kontorer',
        contentType: 'base:folder',
        parentPath: '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontakt-oss/',
        branch: 'draft',
        data: {

        },
    });
}

function createElements () {
    return {
        isNew: true,
        head: 'Fjern gammalt skrot',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Fjern gammelt innhold',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'fjern-old',
                            progress: {
                                value: 'fjern-old-value',
                                max: 'fjern-old-max',
                                valId: 'fjern-old-val',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-old',
                            text: 'Fjern',
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
                            text: 'Fjern gamle nyheter',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'fjern-nyheter-id',
                            progress: {
                                value: 'fjern-nyheter-value',
                                max: 'fjern-nyheter-max',
                                valId: 'fjern-nyheter-progress-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-nyheter',
                            text: 'Fjern',
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
                            text: 'Fjern gamle pressemeldinger',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'fjern-pressemeldinger-value',
                                max: 'fjern-pressemeldinger-max',
                                valId: 'fjern-pressemeldinger-progress-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-pressemeldinger',
                            text: 'Fjern',
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
                            text: 'Fjern Nyhet_brukerportal',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'fjern-nyheter-brukerportal-value',
                                max: 'fjern-nyheter-brukerportal-max',
                                valId: 'fjern-nyheter-brukerportal-progress-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-nyheter-brukerportal',
                            text: 'Fjern',
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
                            text: 'Fjern alle som ikke er approved',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'fjern-non-approved-value',
                                max: 'fjern-non-approved-max',
                                valId: 'fjern-non-approved-progress-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-non-approved',
                            text: 'Fjern',
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
                            text: 'Fjern tomme mapper',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'remove-empty-folders-value',
                                max: 'remove-empty-folders-max',
                                valId: 'remove-empty-folders-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'remove-empty-folders',
                            text: 'Fjern',
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
                            text: 'Fjern enhetsinformasjon',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'remove-enhetsinformasjon-value',
                                max: 'remove-enhetsinformasjon-max',
                                valId: 'remove-enhetsinformasjon-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'remove-enhetsinformasjon',
                            text: 'Fjern',
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
