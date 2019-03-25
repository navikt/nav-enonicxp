var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var trans = require('../../site/lib/contentTranslator');
var nodeLib = require('/lib/xp/node');
var repo = nodeLib.connect({
    repoId: 'cms-repo',
    branch: 'draft',
    principals: ['role:system.admin']
});

exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('do', function(message) {
        createTemplates(socket);
    });
};

function createElements() {
    return {
        isNew: true,
        head: 'Lag templates',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'p',
                            text: 'Lag nye sidemaler'
                        },
                        {
                            tag: 'button',
                            text: 'Lag',
                            action: 'do',
                            id: 'testid',
                            tagClass: ['button', 'is-info']
                        },
                        {
                            tag: 'div',
                            update: 'templateUpdate'
                        }
                    ]
                }
            ]
        }
    };
}

function createTemplates(socket) {
    context.run(
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
            templates.forEach(function(value) {
                var parent = content.get({
                    key: value.content.parentPath
                });
                if (!parent) {
                    parent = content.create({
                        displayName: 'Templates',
                        parentPath: value.content.parentPath.replace('_templates/', ''),
                        name: '_templates',
                        contentType: 'portal:template-folder',
                        data: {}
                    });
                }
                var exists = content.get({
                    key:
                        value.content.parentPath +
                        value.content.displayName
                            .toLowerCase()
                            .replace(/ - /g, '-')
                            .replace(/ /g, '-')
                });
                var elem = exists ? exists : content.create(value.content);
                repo.modify({
                    key: elem._id,
                    editor: function(c) {
                        c.page = value.page;
                        if (exists) {
                            c.data = value.content.data;
                        }
                        return c;
                    }
                });
                socket.emit('templateUpdate', elem.displayName + ' created');
            });
        }
    );
}

var tavleListePage = {
    controller: 'no.nav.navno:main-page',
    region: [
        {
            name: 'main',
            component: [
                {
                    type: 'PartComponent',
                    PartComponent: {
                        name: 'page-heading-with-menu',
                        template: 'no.nav.navno:page-heading-with-menu',
                        config: {}
                    }
                },
                {
                    type: 'LayoutComponent',
                    LayoutComponent: {
                        name: 'main',
                        template: 'no.nav.navno:main',
                        config: {},
                        region: [
                            {
                                name: 'first',
                                component: {
                                    type: 'PartComponent',
                                    PartComponent: {
                                        name: 'tavleliste',
                                        template: 'no.nav.navno:tavleliste',
                                        config: {}
                                    }
                                }
                            },
                            {
                                name: 'second',
                                component: {
                                    type: 'PartComponent',
                                    PartComponent: {
                                        name: 'tavleliste-relatert-innhold',
                                        template: 'no.nav.navno:tavleliste-relatert-innhold',
                                        config: {}
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            name: 'footer',
            component: {
                type: 'PartComponent',
                PartComponent: {
                    name: 'page-footer',
                    template: 'no.nav.navno:page-footer',
                    config: {}
                }
            }
        }
    ],
    config: {},
    customized: false
};

var mainArticlePage = {
    controller: 'no.nav.navno:main-page',
    region: [
        {
            name: 'main',
            component: [
                {
                    type: 'PartComponent',
                    PartComponent: {
                        name: 'page-heading-with-menu',
                        template: 'no.nav.navno:page-heading-with-menu',
                        config: {}
                    }
                },
                {
                    type: 'LayoutComponent',
                    LayoutComponent: {
                        name: 'main',
                        template: 'no.nav.navno:main',
                        config: {},
                        region: [
                            {
                                name: 'first',
                                component: {
                                    type: 'PartComponent',
                                    PartComponent: {
                                        name: 'main-article',
                                        template: 'no.nav.navno:main-article',
                                        config: {}
                                    }
                                }
                            },
                            {
                                name: 'second',
                                component: [
                                    {
                                        type: 'PartComponent',
                                        PartComponent: {
                                            name: 'main-article-linked-list',
                                            template: 'no.nav.navno:main-article-linked-list',
                                            config: {}
                                        }
                                    },
                                    {
                                        type: 'PartComponent',
                                        PartComponent: {
                                            name: 'main-article-related-content',
                                            template: 'no.nav.navno:main-article-related-content',
                                            config: {}
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]
        },
        {
            name: 'footer',
            component: {
                type: 'PartComponent',
                PartComponent: {
                    name: 'page-footer',
                    template: 'no.nav.navno:page-footer',
                    config: {}
                }
            }
        }
    ],
    config: {},
    customized: false
};

var transportPage = {
    controller: 'no.nav.navno:main-page',
    region: [
        {
            name: 'main',
            component: [
                {
                    type: 'PartComponent',
                    PartComponent: {
                        name: 'page-heading-with-menu',
                        template: 'no.nav.navno:page-heading-with-menu',
                        config: {}
                    }
                },
                {
                    type: 'LayoutComponent',
                    LayoutComponent: {
                        name: '1-col',
                        template: 'no.nav.navno:1-col',
                        config: {},
                        region: {
                            name: 'first',
                            component: {
                                type: 'PartComponent',
                                PartComponent: {
                                    name: 'transport',
                                    template: 'no.nav.navno:transport',
                                    config: {}
                                }
                            }
                        }
                    }
                }
            ]
        },
        {
            name: 'footer',
            component: {
                type: 'PartComponent',
                PartComponent: {
                    name: 'page-footer',
                    template: 'no.nav.navno:page-footer',
                    config: {}
                }
            }
        }
    ],
    config: {},
    customized: false
};

var hovedSeksjonPage = {
    controller: 'no.nav.navno:main-page',
    region: [
        {
            name: 'main',
            component: [
                {
                    type: 'PartComponent',
                    PartComponent: {
                        name: 'page-heading-with-menu',
                        template: 'no.nav.navno:page-heading-with-menu',
                        config: {}
                    }
                },
                {
                    type: 'LayoutComponent',
                    LayoutComponent: {
                        name: 'main-1-col',
                        template: 'no.nav.navno:main-1-col',
                        config: {},
                        region: {
                            name: 'first',
                            component: {
                                type: 'PartComponent',
                                PartComponent: {
                                    name: 'Oppslagstavle',
                                    template: 'no.nav.navno:oppslagstavle',
                                    config: {}
                                }
                            }
                        }
                    }
                }
            ]
        },
        {
            name: 'footer',
            component: {
                type: 'PartComponent',
                PartComponent: {
                    name: 'page-footer',
                    template: 'no.nav.navno:page-footer',
                    config: {}
                }
            }
        }
    ],
    config: {},
    customized: false
};

var ekstraStorTabell = {
    controller: 'no.nav.navno:ekstraStorTabell',
    config: {},
    customized: false
};

var templates = [
    {
        content: {
            displayName: 'Artikkel - Hovedartikkel',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:main-article'
            }
        },
        page: mainArticlePage
    },
    {
        content: {
            displayName: 'Seksjon - Tavleseksjon',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:tavleliste'
            }
        },
        page: tavleListePage
    },

    {
        content: {
            displayName: 'Seksjon - Hovedseksjon',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:oppslagstavle'
            }
        },
        page: hovedSeksjonPage
    },
    {
        content: {
            displayName: 'Seksjon - Transportside',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:transport'
            }
        },
        page: transportPage
    },
    {
        content: {
            displayName: 'Page - Ekstra Stor Tabell',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:Ekstra_stor_tabell'
            }
        },
        page: ekstraStorTabell
    },
    {
        content: {
            displayName: 'Page - Ekstra Stor Tabell',
            parentPath: '/content/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:Ekstra_stor_tabell'
            }
        },
        page: ekstraStorTabell
    }
];
