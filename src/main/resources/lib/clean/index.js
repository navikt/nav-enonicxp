var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);




    // TODO Fjern nav-old

    socket.on('fjern-old', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            fjernOld(socket);
        })

    });



    socket.on('fjern-nyheter', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            fjernNyheter(socket);
        })

    })
    socket.on('fjern-pressemeldinger', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            fjernPressemeldinger(socket);
        })

    })
    socket.on('fjern-nyheter-brukerportal', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            fjernNyheterBrukerPortal(socket);
        })

    })

}
function fjernNyheterBrukerPortal(socket) {
    var res = content.query({
        start: 0,
        count: 100000,
        contentTypes: [
            app.name + ':Nyhet_brukerportal'
        ]
    });
    socket.emit('fjern-nyheter-brukerportal-max', res.total);
    res.hits.forEach(function (value, index) {
        socket.emit('fjern-nyheter-brukerportal-value', index + 1);
        content.delete({key: value._id}) ? log.info('Removed ' + value._path) : log.info('Failed to remove ' + value._path);
    })
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
    res.hits.forEach(function (value, index) {
        socket.emit('fjern-rettskildene-value', index + 1);
        content.delete({key: value._id}) ? log.info('Removed ' + value._path) : log.info('Failed to remove ' + value._path);
    })
}

function fjernPressemeldinger(socket) {
    var res = content.query({
        start: 0,
        count: 100000,
        contentTypes: [
             app.name + ':nav.pressemelding'
         ]

    });
    var date = new Date();
    var aYearAgo = new Date(date.setFullYear(date.getFullYear() - 1));
    var reduced = res.hits.reduce(function(t, el) {
        var md = el.modifiedTime || el.createdTime;
        if (new Date(md) < aYearAgo) t.push(el);
        return t;
    },[])
    socket.emit('fjern-pressemeldinger-max', reduced.length);
    reduced.forEach(function(element, index) {
        socket.emit('fjern-pressemeldinger-value', index + 1);
        content.delete({key: element._id}) ? log.info('Removed ' + element._path) : log.info('Failed to remove ' + element._path);
    })
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
        'satser-og-datoer'
    ]
    socket.emit('fjern-old-max', pathsToRemove.length);
    pathsToRemove.forEach(function (value, index) {
        socket.emit('fjern-old-value', index + 1);
        content.delete({
            key: '/content/' + value
        })
    })

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
        contentTypes: [
            app.name + ':nav.nyhet'
        ]

    });
    var date = new Date();
    var aYearAgo = new Date(date.setFullYear(date.getFullYear() - 1));
    var reduced = res.hits.reduce(function(t, el) {
        var md = el.modifiedTime || el.createdTime;
        if (new Date(md) < aYearAgo) t.push(el);
        return t;
    },[])
    socket.emit('fjern-nyheter-max', reduced.length);
    reduced.forEach(function(element, index) {
        socket.emit('fjern-nyheter-value', index + 1);
        content.delete({key: element._id}) ? log.info('Removed ' + element._path) : log.info('Failed to remove ' + element._path);
    })
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
                                value: 'fjern-pressemeldinger',
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
                }



            ]
        }


    }
}
