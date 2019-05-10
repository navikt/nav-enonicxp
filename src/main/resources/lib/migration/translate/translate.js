var contentLib = require('/lib/xp/content');
var nodeLib = require('/lib/xp/node');
var trans = require('/lib/migration/contentTranslator');
var translateRapportHandbok = require('./translateRapportHandbok');
var translateContentAZ = require('./translateContentAZ');
var tools = require('/lib/tools');
var repo = nodeLib.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin']
});
exports.handle = function(socket) {
    socket.emit('newTask', createElements());
    socket.on('navnyhet', function() {
        tools.runInContext(socket, updateNavNyhet);
    });
    socket.on('navpressemelding', function() {
        tools.runInContext(socket, updatePressemelding);
    });
    socket.on('sidebeskrivelse', function() {
        tools.runInContext(socket, updateTavleliste);
    });
    socket.on('cms2xp_page', function() {
        tools.runInContext(socket, updateCms2xpPage);
    });
    socket.on('main', function() {
        tools.runInContext(socket, updateMainOppslagstavle);
    });
    socket.on('min', function() {
        tools.runInContext(socket, updateOppslagstavle);
    });
    socket.on('cms2xp_section', function() {
        tools.runInContext(socket, changeSection2TavleListe);
    });
    socket.on('Kort_om', function() {
        tools.runInContext(socket, updateKortOm);
    });
    socket.on('Artikkel_Brukerportal', function() {
        tools.runInContext(socket, updateArtikkelBrukerportal);
    });
    socket.on('rapportHandbok', function() {
        tools.runInContext(socket, translateRapportHandbok.handleRapportHandbok);
    });
    socket.on('navRapportHandbok', function() {
        tools.runInContext(socket, translateRapportHandbok.handleNavRapportHandbok);
    });
    socket.on('contentAZ', function() {
        tools.runInContext(socket, translateContentAZ.handleContentAZ);
    });
};

function updatePressemelding(socket) {
    transl8('nav.pressemelding', socket);
}

function updateNavNyhet(socket) {
    transl8('nav.nyhet', socket);
}

function updateTavleliste(socket) {
    trans.transSidebeskrivelse(getIndexConfig('tavleliste'), socket);
}

function updateCms2xpPage(socket) {
    trans.transcms2xpPages(getIndexConfig('main-article'), socket);
}

function updateMainOppslagstavle(socket) {
    trans.transMainSection(getIndexConfig('oppslagstavle'), socket);
}

function updateOppslagstavle(socket) {
    trans.tmins(getIndexConfig('oppslagstavle'), socket);
}

function updateKortOm(socket) {
    transl8('Kort_om', socket);
}

function updateArtikkelBrukerportal(socket) {
    transl8('Artikkel_Brukerportal', socket);
}

function stripContentType(type) {
    return type.replace(app.name + ':', '');
}

function toContentType(type) {
    return app.name + ':' + type;
}

function transl8(type, socket) {
    return itterateContents(query(type, socket), socket);
}

function getHits(hits, type) {
    return contentLib.query(getQueryObject(type, hits)).hits;
}

function getQueryObject(type, hits) {
    return {
        start: hits,
        count: 100,
        contentTypes: [toContentType(type)]
    };
}

function query(type, socket) {
    var hits = 100;
    var ret = [];

    while (hits) {
        hits = ret.length;
        ret = ret.concat(getHits(hits, type));
        hits = ret.length - hits;
    }
    socket.emit(type + 'max', ret.length);
    return ret;
}

function itterateContents(contents, socket) {
    var ret = false;

    contents.forEach(function(value, index) {
        var el = repo.get(value._id);

        socket.emit(stripContentType(el.type) + 'val', index + 1);
        repo.modify({
            key: el._id,
            editor: editor
        });
    });
    // repo.modify({
    //     key: contents[0]._id,
    //     editor: editor
    // });

    return ret;
}

function editor(c) {
    return updateContent(c);
}

function updateContent(c) {
    // log.info('****************BEFORE*******************');
    // log.info(JSON.stringify(c, null, 4));
    if (stripContentType(c.type) in trans.ret) {
        c = trans.ret[stripContentType(c.type)](c);
        c.type = toContentType('main-article');
        trans.addTemplateToContent(c, trans.getTemplate('artikkel-hovedartikkel'));
        c._indexConfig = getIndexConfig('main-article');
    }
    // log.info('****************AFTER********************');
    // log.info(JSON.stringify(c, null, 4));
    return c;
}

function getIndexConfig(type) {
    var ret = contentLib.get({ key: '/www.nav.no/no/' + type });
    ret = ret ? repo.get(ret._id) : null;
    if (!ret) {
        var data =
            type === 'main-article'
                ? {
                      ingress: type,
                      text: type
                  }
                : {};
        ret = contentLib.create({
            name: type,
            contentType: toContentType(type),
            valid: false,
            data: data,
            parentPath: '/www.nav.no/no/'
        });
    }
    if (!ret) throw 'No index config';
    return ret._indexConfig;
}

function getTemplate(templateName) {
    var ret = '';
    var r = contentLib.query({
        query: '_name LIKE "' + templateName + '"'
    });
    return r.hits[0]._id;
}

function changeSection2TavleListe(socket) {
    var pagesWithChildren = [];
    var length = 100;
    var start = 0;
    while (length === 100) {
        var q = contentLib.query({
            start: start,
            count: length,
            contentTypes: [app.name + ':cms2xp_section']
        });
        length = q.hits.length;
        start += length;
        pagesWithChildren = q.hits.reduce(function(t, el) {
            if (el.page && el.page.template && el.page.template === getTemplate('artikkelliste-med-sidebeskrivelse-subseksjon')) t.push(el);
            return t;
        }, pagesWithChildren);
    }

    socket.emit('cms2xp_sectionmax', pagesWithChildren.length);

    pagesWithChildren.forEach(function(value, index) {
        socket.emit('cms2xp_sectionval', index + 1);
        trans.doTableListTranslation(value);
    });
}

function createElements() {
    return {
        isNew: true,
        head: 'Translate',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Hovedseksjonssider'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'main',
                            progress: {
                                value: 'mainval',
                                max: 'mainmax',
                                valId: 'sidebeskrivelseval'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'mainbutton',
                            action: 'main',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Seksjonssider'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'min',
                            progress: {
                                value: 'minval',
                                max: 'minmax',
                                valId: 'sidebeskrivelseval'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'minbutton',
                            action: 'min',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Cms2xp_section'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'cms2xp_section',
                            progress: {
                                value: 'cms2xp_sectionval',
                                max: 'cms2xp_sectionmax',
                                valId: 'sidebeskrivelseval'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'cms2xp_sectionbutton',
                            action: 'cms2xp_section',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Sidebeskrivelse'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'sidebeskrivelse',
                            progress: {
                                value: 'sidebeskrivelseval',
                                max: 'sidebeskrivelsemax',
                                valId: 'sidebeskrivelseval'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'sidebeskrivelsebutton',
                            action: 'sidebeskrivelse',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Cms2Xp Page'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'cms2xp_page',
                            progress: {
                                value: 'cms2xp_pageval',
                                max: 'cms2xp_pagemax',
                                valId: 'sidebeskrivelseval'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'cms2xp_pagebutton',
                            action: 'cms2xp_page',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'p',
                            text: 'nav.nyhet'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'tnyhet',
                            progress: {
                                value: 'nav.nyhetval',
                                max: 'nav.nyhetmax',
                                valId: 'tnyhetvalue'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'navnyhet',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'p',
                            text: 'nav.pressemelding'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'tpressemelding',
                            progress: {
                                value: 'nav.pressemeldingval',
                                max: 'nav.pressemeldingmax',
                                valId: 'tpressemeldingvalue'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'navpressemelding',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Kort Om'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'Kort_om',
                            progress: {
                                value: 'Kort_omval',
                                max: 'Kort_ommax',
                                valId: 'sidebeskrivelseval'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'kort_ombutton',
                            action: 'Kort_om',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Artikkel Brukerportal'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'Artikkel_Brukerportal',
                            progress: {
                                value: 'Artikkel_Brukerportalval',
                                max: 'Artikkel_Brukerportalmax',
                                valId: 'sidebeskrivelseval'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'Artikkel_Brukerportalbutton',
                            action: 'Artikkel_Brukerportal',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'span',
                            text: 'Rapport-handbok'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'rapport-handbok',
                            progress: {
                                value: 'rapport-handbok-value',
                                max: 'rapport-handbok-max',
                                valId: 'rapport-handbok-val-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'rapportHandbok',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'span',
                            text: 'Nav Rapport-hanbok'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'nav-rapport-handbok',
                            progress: {
                                value: 'nav-rapport-handbok-value',
                                max: 'nav-rapport-handbok-max',
                                valId: 'nav-rapport-handbok-val-id'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'navRapportHandbok',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'span',
                            text: 'Content A-Z'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'content-az',
                            progress: {
                                value: 'content-az-value',
                                max: 'content-az-max',
                                valId: 'content-az-val-id'
                            }
                        },
                        {
                            tag: 'p',
                            status: 'content-az-status'
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'contentAZ',
                            text: 'Translate'
                        },
                        {
                            tag: 'li',
                            tagClass: ['navbar-divider']
                        }
                    ]
                }
            ]
        }
    };
}
