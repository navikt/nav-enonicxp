var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var utils = require('/lib/nav-utils');
exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);

    // TODO Fjern nav-old

    socket.on('fjern-old', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                fjernOld(socket);
            }
        );
    });

    socket.on('fjern-nyheter', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                fjernNyheter(socket);
            }
        );
    });
    socket.on('fjern-pressemeldinger', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                fjernPressemeldinger(socket);
            }
        );
    });
    socket.on('fjern-nyheter-brukerportal', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                fjernNyheterBrukerPortal(socket);
            }
        );
    });
    socket.on('fjern-non-approved', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                fjernNonApproved(socket);
            }
        );
    });
    socket.on('remove-empty-folders', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                removeEmptyFolders(socket);
            }
        );
    });
};

function removeEmptyFolders(socket) {
    var folders = content.query({
        start: 0,
        count: 5000,
        query: 'type = "base:folder" AND _state NOT LIKE "PENDING_DELETE"'
    }).hits;

    socket.emit('remove-empty-folders-max', folders.length);
    var anyDeletions = false;
    folders.forEach(function(folder, index) {
        if (folder.hasChildren === false) {
            content.delete({
                key: folder._id
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

function fjernNonApproved(socket) {
    var nonApproved = content.query({
        start: 0,
        count: 90000,
        filters: {
            boolean: {
                must: {
                    exists: {
                        field: 'x.no-nav-navno.cmsStatus'
                    }
                },
                mustNot: {
                    hasValue: {
                        field: 'x.no-nav-navno.cmsStatus.status',
                        values: ['approved']
                    }
                }
            }
        }
    });
    socket.emit('fjern-non-approved-max', nonApproved.hits.length);
    nonApproved.hits.forEach(function(value, index) {
        socket.emit('fjern-non-approved-value', index + 1);
        var contentKey;
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
        var cmsContent = content.query({
            start: 0,
            count: 10000,
            query: 'data.parameters.value = "' + contentKey + '"'
        }).hits;
        if (cmsContent.length > 0) {
            cmsContent.forEach(function(v) {
                content.delete({ key: v._id });
            });
        }
        content.delete({ key: value._id });
        //log.info(JSON.stringify([cmsContent, value], null, 4));
    });
}
function fjernNyheterBrukerPortal(socket) {
    var res = content.query({
        start: 0,
        count: 100000,
        contentTypes: [app.name + ':Nyhet_brukerportal']
    });
    socket.emit('fjern-nyheter-brukerportal-max', res.total);
    res.hits.forEach(function(value, index) {
        socket.emit('fjern-nyheter-brukerportal-value', index + 1);
        content.delete({ key: value._id }) ? log.info('Removed ' + value._path) : log.info('Failed to remove ' + value._path);
    });
}

function fjernRettskilder(socket) {
    var res = content.query({
        start: 0,
        count: 100000,
        contentTypes: [
            'no.nav.navno:Rettskildene_norsk_lovkommentar',
            app.name + ':Rettskildene_paragrafendring',
            app.name + ':Rettskildene_paragraf',
            app.name + ':Rettskildene_kapittelendring',
            'no.nav.navno:Rettskildene_forskrift',
            'no.nav.navno:Rettskildene_trygderettkjennels',
            'no.nav.navno:Rettskildene_kapittel',
            'no.nav.navno:Rettskildene_lovendring',
            'no.nav.navno:Rettskildene_rundskriv',
            'no.nav.navno:Rettskildene_preparat',
            'no.nav.navno:Rettskildene_vedlegg',
            'no.nav.navno:Rettskildene_virkestoff',
            'no.nav.navno:Rettskildene_artikkel',
            'no.nav.navno:Rettskildene_lov',
            'no.nav.navno:Rettskildene_eu_artikkel',
            'no.nav.navno:Rettskildene_lovoversikt',
            'no.nav.navno:Rettskildene_kapitteloversikt',
            'no.nav.navno:Rettskildene_oversikt',
            'no.nav.navno:Rettskildene_endringslogg',
            'no.nav.navno:Rettskildene_legemiddelliste',
            'no.nav.navno:Rettskildene_prinsippkjennelse'
        ]
    });
    socket.emit('fjern-rettskildene-max', res.total);
    res.hits.forEach(function(value, index) {
        socket.emit('fjern-rettskildene-value', index + 1);
        content.delete({ key: value._id }) ? log.info('Removed ' + value._path) : log.info('Failed to remove ' + value._path);
    });
}

function fjernPressemeldinger(socket) {
    var res = content.query({
        start: 0,
        count: 100000,
        query: 'modifiedTime < instant("2018-01-01T00:00:00.00Z")',
        contentTypes: [app.name + ':nav.pressemelding']
    });

    socket.emit('fjern-pressemeldinger-max', res.hits.length);
    res.hits.forEach(function(element, index) {
        socket.emit('fjern-pressemeldinger-value', index + 1);
        content.delete({ key: element._id }) ? log.info('Removed ' + element._path) : log.info('Failed to remove ' + element._path);
    });
}

function fjernOld(socket) {
    var pathsToRemove = [
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
        'skjemaveileder',
        'kampanjer',
        'skjemaer',
        'emneord',
        'kontaktinformasjon',
        'rettskildene-ekstern',
        'bilder-felles-nav.no-og-navet',
        'sprak',
        'selvbetjening',
        'satser-og-datoer',
        'bilder-nav.no',
        'nav.no-lokalt/fylke/arkiv-fylkessider',
        'nav.no-lokalt/arbeidslivssenter/arkiv-arbeidslivssider'
    ];
    socket.emit('fjern-old-max', pathsToRemove.length);
    pathsToRemove.forEach(function(value, index) {
        socket.emit('fjern-old-value', index + 1);
        content.delete({
            key: '/content/' + value
        });
    });
}

function fjernKN(socket) {
    socket.emit('fjern-kn-max', 1);
    content.delete({
        key: '/content/kommunenavet'
    });
    socket.emit('fjern-kn-value', 1);
}

function fjernNyheter(socket) {
    var res = content.query({
        start: 0,
        count: 100000,
        query: 'modifiedTime < instant("2018-01-01T00:00:00.00Z")',
        contentTypes: [app.name + ':nav.nyhet']
    });

    socket.emit('fjern-nyheter-max', res.hits.length);
    res.hits.forEach(function(element, index) {
        socket.emit('fjern-nyheter-value', index + 1);
        content.delete({ key: element._id }) ? log.info('Removed ' + element._path) : log.info('Failed to remove ' + element._path);
    });
}

function createElements() {
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
                            text: 'Fjern gammelt innhold'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'fjern-old',
                            progress: {
                                value: 'fjern-old-value',
                                max: 'fjern-old-max',
                                valId: 'fjern-old-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-old',
                            text: 'Fjern'
                        }
                    ]
                },

                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Fjern gamle nyheter'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'fjern-nyheter-id',
                            progress: {
                                value: 'fjern-nyheter-value',
                                max: 'fjern-nyheter-max',
                                valId: 'fjern-nyheter-progress-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-nyheter',
                            text: 'Fjern'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Fjern gamle pressemeldinger'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'fjern-pressemeldinger-value',
                                max: 'fjern-pressemeldinger-max',
                                valId: 'fjern-pressemeldinger-progress-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-pressemeldinger',
                            text: 'Fjern'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Fjern Nyhet_brukerportal'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'fjern-nyheter-brukerportal',
                                max: 'fjern-nyheter-brukerportal-max',
                                valId: 'fjern-nyheter-brukerportal-progress-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-nyheter-brukerportal',
                            text: 'Fjern'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Fjern alle som ikke er approved'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'fjern-non-approved-value',
                                max: 'fjern-non-approved-max',
                                valId: 'fjern-non-approved-progress-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'fjern-non-approved',
                            text: 'Fjern'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Fjern tomme mapper'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            progress: {
                                value: 'remove-empty-folders-value',
                                max: 'remove-empty-folders-max',
                                valId: 'remove-empty-folders-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'remove-empty-folders',
                            text: 'Fjern'
                        }
                    ]
                }
            ]
        }
    };
}
