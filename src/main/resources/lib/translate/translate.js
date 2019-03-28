var contentLib = require('/lib/xp/content');
var nodeLib = require('/lib/xp/node');
var task = require('/lib/xp/task');
var trans = require('/lib/contentTranslator');
var auth = require('/lib/xp/auth');
var contextLib = require('/lib/xp/context');
var repo = nodeLib.connect({
    repoId: 'cms-repo',
    branch: 'draft',
    principals: ['role:system.admin']
});
exports.handle = function(socket) {
    var elements = {
        elements: createElements()
    };
    elements.action = [
        {
            id: 'navnyhet',
            emit: 'navnyhet',
            action: 'hello'
        },
        {
            id: 'navpressemelding',
            emit: 'navpressemelding',
            action: 'hello'
        }
    ];
    elements.progress = [
        {
            id: 'tnyhet',
            value: 'nav.nyhetval',
            max: 'nav.nyhetmax',
            valId: 'tnyhetvalue'
        },
        {
            id: 'tpressemelding',
            value: 'nav.pressemeldingval',
            max: 'nav.pressemeldingmax',
            valId: 'tpressemeldingvalue'
        }
    ];
    socket.emit('newTask', elements);
    socket.on('navnyhet', function(message) {
        task.submit({
            description: 'Translating nav-nyhet',
            task: function() {
                updateNavNyhet(socket, message);
            }
        });
    });
    socket.on('navpressemelding', function(message) {
        task.submit({
            description: 'Translating navpressemeldinger',
            task: function() {
                updatePressemelding(socket, message);
            }
        });
    });
};

function updatePressemelding(socket, message) {
    transl8('nav.pressemelding', socket);
    createCmsStuff(socket);
}

function updateNavNyhet(socket, message) {
    translateNavNyhet(socket);
}

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
                                tag: '<p class="card-header-title is-center">Translate</p>',
                                elements: []
                            }
                        ]
                    },
                    {
                        tag: '<div class="card-content"></div>',
                        elements: [
                            {
                                tag: '<div class="row"></div>',
                                elements: [
                                    {
                                        tag: '<div class="column"></div>',
                                        elements: [
                                            {
                                                tag: '<p>nav.nyhet</p>',
                                                elements: []
                                            },
                                            {
                                                tag: '<progress id="tnyhet" class="progress is-info" value="0" max="100"></progress>',
                                                elements: []
                                            },
                                            {
                                                tag: '<p id="tnhyhetvalue"></p>',
                                                elements: []
                                            },
                                            {
                                                tag: '<button class="button is-info" id="navnyhet">Translate</button>',
                                                elements: []
                                            }
                                        ]
                                    },
                                    {
                                        tag: '<div class="column"></div>',
                                        elements: [
                                            {
                                                tag: '<p>nav.pressemelding</p>',
                                                elements: []
                                            },
                                            {
                                                tag: '<progress id="tpressemelding" class="progress is-info" value="0" max="100"></progress>',
                                                elements: []
                                            },
                                            {
                                                tag: '<p id="tpressemeldingvalue"></p>',
                                                elements: []
                                            },
                                            {
                                                tag: '<button class="button is-info" id="navpressemelding">Translate</button>',
                                                elements: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    };
}

function translateNavNyhet(socket) {
    return transl8('nav.nyhet', socket);
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

    return ret;
}

function editor(c) {
    return updateContent(c);
}

function updateContent(c) {
    if (stripContentType(c.type) in trans.ret) {
        c = trans.ret[stripContentType(c.type)](c);
        c.type = toContentType('main-article');
        c.page = {
            template: trans.getTemplate('artikkel-hovedartikkel')
        };
        c._indexConfig = getIndexConfig('main-article');
    }

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

function translateCMSStuff(socket) {
    socket.on('sidebeskrivelse', function() {
        task.submit({
            description: 'Changing sidebeskrivelse',
            task: function() {
                trans.transSidebeskrivelse(getIndexConfig('tavleliste'), socket);
            }
        });
    });
    socket.on('cms2xp_page', function() {
        task.submit({
            description: 'Changing cms2xp_page',
            task: function() {
                trans.transcms2xpPages(getIndexConfig('main-article'), socket);
            }
        });
    });
    socket.on('main', function() {
        task.submit({
            description: 'Changing Main sections',
            task: function() {
                trans.transMainSection(getIndexConfig('oppslagstavle'), socket);
            }
        });
    });
    socket.on('min', function() {
        task.submit({
            description: 'Changing secondary sections',
            task: function() {
                trans.tmins(getIndexConfig('oppslagstavle'), socket);
            }
        });
    });
    socket.on('cms2xp_section', function() {
        task.submit({
            description: 'Changing cms2xp_sections',
            task: function() {
                changeSection2TavleListe(socket);
            }
        });
    });

    return false;
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

var cmsUpdates = {
    main: false,
    sidebeskrivelse: false,
    c2xp: false,
    min: false,
    c2xs: false
};

function checkCU(key, socket) {
    cmsUpdates[key] = true;
    if (cmsUpdates.main && cmsUpdates.sidebeskrivelse && cmsUpdates.c2xp && cmsUpdates.c2xs && cmsUpdates.min) {
        createKA(socket);
    }
}

function createCmsStuff(socket) {
    var elements = createAllElements();
    socket.emit('newTask', elements);
    socket.on('sidebeskrivelse', function() {
        task.submit({
            description: 'Changing sidebeskrivelse',
            task: function() {
                contextLib.run(
                    {
                        repository: 'cms-repo',
                        branch: 'draft',
                        user: {
                            login: 'su',
                            userStore: 'system'
                        },
                        principals: ['role:system.admin']
                    },
                    function() {
                        trans.transSidebeskrivelse(getIndexConfig('tavleliste'), socket);
                        checkCU('sidebeskrivelse', socket);
                    }
                );
            }
        });
    });
    socket.on('cms2xp_page', function() {
        task.submit({
            description: 'Changing cms2xp_page',
            task: function() {
                contextLib.run(
                    {
                        repository: 'cms-repo',
                        branch: 'draft',
                        user: {
                            login: 'su',
                            userStore: 'system'
                        },
                        principals: ['role:system.admin']
                    },
                    function() {
                        trans.transcms2xpPages(getIndexConfig('main-article'), socket);
                        checkCU('c2xp', socket);
                    }
                );
            }
        });
    });
    socket.on('main', function() {
        task.submit({
            description: 'Changing Main sections',
            task: function() {
                contextLib.run(
                    {
                        repository: 'cms-repo',
                        branch: 'draft',
                        user: {
                            login: 'su',
                            userStore: 'system'
                        },
                        principals: ['role:system.admin']
                    },
                    function() {
                        trans.transMainSection(getIndexConfig('oppslagstavle'), socket);
                        checkCU('main', socket);
                    }
                );
            }
        });
    });
    socket.on('min', function() {
        task.submit({
            description: 'Changing secondary sections',
            task: function() {
                contextLib.run(
                    {
                        repository: 'cms-repo',
                        branch: 'draft',
                        user: {
                            login: 'su',
                            userStore: 'system'
                        },
                        principals: ['role:system.admin']
                    },
                    function() {
                        trans.tmins(getIndexConfig('oppslagstavle'), socket);
                        checkCU('min', socket);
                    }
                );
            }
        });
    });
    socket.on('cms2xp_section', function() {
        task.submit({
            description: 'Changing cms2xp_sections',
            task: function() {
                contextLib.run(
                    {
                        repository: 'cms-repo',
                        branch: 'draft',
                        user: {
                            login: 'su',
                            userStore: 'system'
                        },
                        principals: ['role:system.admin']
                    },
                    function() {
                        changeSection2TavleListe(socket);
                        checkCU('c2xs', socket);
                    }
                );
            }
        });
    });
}

function createAllElements() {
    return {
        isNew: true,
        head: 'Translate CMS stuff',
        body: {
            elements: [
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
                            tagClass: ['button', 'is-small', 'is-info'],
                            id: 'sidebeskrivelsebutton',
                            action: 'sidebeskrivelse',
                            text: 'Translate'
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
                            tagClass: ['button', 'is-small', 'is-info'],
                            id: 'cms2xp_pagebutton',
                            action: 'cms2xp_page',
                            text: 'Translate'
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
                            tagClass: ['button', 'is-small', 'is-info'],
                            id: 'minbutton',
                            action: 'min',
                            text: 'Translate'
                        }
                    ]
                },
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
                            tagClass: ['button', 'is-small', 'is-info'],
                            id: 'mainbutton',
                            action: 'main',
                            text: 'Translate'
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
                            tagClass: ['button', 'is-small', 'is-info'],
                            id: 'cms2xp_sectionbutton',
                            action: 'cms2xp_section',
                            text: 'Translate'
                        }
                    ]
                }
            ]
        }
    };
}

function createKA(socket) {
    var elements = createKAElements();

    socket.emit('newTask', elements);

    socket.on('Kort_om', function() {
        transl8('Kort_om', socket);
    });
    socket.on('Artikkel_Brukerportal', function() {
        transl8('Artikkel_Brukerportal', socket);
    });
}

function createKAElements() {
    return {
        isNew: true,
        head: 'Translate Kort Om og Artikkel brukerportal',
        body: {
            elements: [
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
                            tagClass: ['button', 'is-small', 'is-info'],
                            id: 'kort_ombutton',
                            action: 'Kort_om',
                            text: 'Translate'
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
                            tagClass: ['button', 'is-small', 'is-info'],
                            id: 'Artikkel_Brukerportalbutton',
                            action: 'Artikkel_Brukerportal',
                            text: 'Translate'
                        }
                    ]
                }
            ]
        }
    };
}
