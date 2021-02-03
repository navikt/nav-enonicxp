const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    node: require('/lib/xp/node'),
    tools: require('/lib/migration/tools'),
};
const repo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});

const tavleListePage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:notifications',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:page-list',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/second/0',
        part: {
            descriptor: 'no.nav.navno:menu-list',
            config: {
                'no-nav-navno': {},
            },
        },
    },
];

const mainArticlePage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:notifications',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:main-article',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/second/0',
        part: {
            descriptor: 'no.nav.navno:main-article-linked-list',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/second/1',
        part: {
            descriptor: 'no.nav.navno:menu-list',
            config: {
                'no-nav-navno': {},
            },
        },
    },
];

const transportPage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:notifications',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main-1-col',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:page-heading',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/1',
        part: {
            descriptor: 'no.nav.navno:link-panels',
            config: {
                'no-nav-navno': {},
            },
        },
    },
];

const hovedSeksjonPage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:notifications',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main-1-col',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:page-heading',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/1',
        part: {
            descriptor: 'no.nav.navno:breaking-news',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    // Hovedpaneler (bokser med seperator) f.eks. Logg inn på Ditt NAV
    {
        type: 'part',
        path: '/main/1/first/2',
        part: {
            descriptor: 'no.nav.navno:main-panels',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    // Lenkepaneler, f.eks. Hva er din situasjon?
    {
        type: 'part',
        path: '/main/1/first/3',
        part: {
            descriptor: 'no.nav.navno:link-panels',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    // Lenkelister, f.eks. Nyttig og vite, nyheter og snareveier
    {
        type: 'part',
        path: '/main/1/first/4',
        part: {
            descriptor: 'no.nav.navno:link-lists',
            config: {
                'no-nav-navno': {},
            },
        },
    },
];

const largeTable = {
    type: 'page',
    path: '/',
    page: {
        descriptor: 'no.nav.navno:main-page',
        customized: true,
        config: {
            'no-nav-navno': {},
        },
    },
};

const publishingCalendarPage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:notifications',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:publishing-calendar',
            config: {
                'no-nav-navno': {},
            },
        },
    },
];

const dynamicPage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {},
            },
        },
    },
];

const pageWithSideMenus = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:page-with-side-menus',
            customized: true,
            config: {
                'no-nav-navno': {},
            },
        },
    },
];

const officeInformationPage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:notifications',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {},
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:office-information',
            config: {
                'no-nav-navno': {},
            },
        },
    },
];
//
const templates = [
    {
        content: {
            displayName: 'Artikkel - Hovedartikkel',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: [
                    'no.nav.navno:main-article',
                    'no.nav.navno:main-article-chapter',
                    'no.nav.navno:melding',
                ],
            },
        },
        components: mainArticlePage,
    },
    {
        content: {
            displayName: 'Seksjon - Tavleseksjon',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:page-list',
            },
        },
        components: tavleListePage,
    },
    {
        content: {
            displayName: 'Seksjon - Hovedseksjon',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:section-page',
            },
        },
        components: hovedSeksjonPage,
    },
    {
        content: {
            displayName: 'Seksjon - Transportside',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:transport-page',
            },
        },
        components: transportPage,
    },
    {
        content: {
            displayName: 'Page - Ekstra Stor Tabell',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:large-table',
            },
        },
        components: largeTable,
    },
    {
        content: {
            displayName: 'Publiseringskalender',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:publishing-calendar',
            },
        },
        components: publishingCalendarPage,
    },
    {
        content: {
            displayName: 'Dynamisk side',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:dynamic-page',
            },
        },
        components: dynamicPage,
    },
    {
        content: {
            displayName: 'Innholdsside med sidemenyer',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:dynamic-page',
            },
        },
        components: pageWithSideMenus,
    },
    {
        content: {
            displayName: 'Enhetsinformasjon',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:office-information',
            },
        },
        components: officeInformationPage,
    },
];

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
                            text: 'Lag nye sidemaler',
                        },
                        {
                            tag: 'button',
                            text: 'Lag',
                            action: 'do',
                            id: 'testid',
                            tagClass: ['button', 'is-info'],
                        },
                        {
                            tag: 'div',
                            update: 'templateUpdate',
                        },
                    ],
                },
            ],
        },
    };
}

function createTemplates(socket) {
    templates.forEach(function (value) {
        const parent = libs.content.get({
            key: value.content.parentPath,
        });
        if (!parent) {
            libs.content.create({
                displayName: 'Templates',
                parentPath: value.content.parentPath.replace('_templates/', ''),
                name: '_templates',
                contentType: 'portal:template-folder',
                data: {},
            });
        }
        const exists = libs.content.get({
            key:
                value.content.parentPath +
                value.content.displayName
                    .toLowerCase()
                    .replace(/ - /g, '-')
                    .replace(/ /g, '-')
                    .replace(/ø/g, 'o'),
        });
        const elem = exists || libs.content.create(value.content);
        repo.modify({
            key: elem._id,
            editor: (c) => {
                return {
                    ...c,
                    components: value.components,
                    data: exists ? value.content.data : c.data,
                };
            },
        });
        socket.emit('templateUpdate', elem.displayName + ' created');
    });
}

exports.handle = function (socket) {
    const elements = createElements();
    socket.emit('newTask', elements);

    socket.on('do', () => {
        libs.tools.runInContext(socket, createTemplates);
    });
};
