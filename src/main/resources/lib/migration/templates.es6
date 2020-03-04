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

exports.handle = function (socket) {
    const elements = createElements();
    socket.emit('newTask', elements);

    socket.on('do', () => {
        libs.tools.runInContext(socket, createTemplates);
    });
};

function createElements () {
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

function createTemplates (socket) {
    templates.forEach(function (value) {
        let parent = libs.content.get({
            key: value.content.parentPath,
        });
        if (!parent) {
            parent = libs.content.create({
                displayName: 'Templates',
                parentPath: value.content.parentPath.replace('_templates/', ''),
                name: '_templates',
                contentType: 'portal:template-folder',
                data: {

                },
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
                c.components = value.components;
                if (exists) {
                    c.data = value.content.data;
                }
                return c;
            },
        });
        socket.emit('templateUpdate', elem.displayName + ' created');
    });
}

const tavleListePage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:page-crumbs',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:page-list',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/second/0',
        part: {
            descriptor: 'no.nav.navno:menu-list',
            config: {
                'no-nav-navno': {

                },
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
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:page-crumbs',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:main-article',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/second/0',
        part: {
            descriptor: 'no.nav.navno:main-article-linked-list',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/second/1',
        part: {
            descriptor: 'no.nav.navno:menu-list',
            config: {
                'no-nav-navno': {

                },
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
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:page-crumbs',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main-1-col',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:transport',
            config: {
                'no-nav-navno': {

                },
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
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:driftsmelding-heading',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1',
        part: {
            descriptor: 'no.nav.navno:page-crumbs',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'layout',
        path: '/main/2',
        layout: {
            descriptor: 'no.nav.navno:main-1-col',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/2/first/0',
        part: {
            descriptor: 'no.nav.navno:section-page',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

const largeTable = {
    type: 'page',
    path: '/',
    page: {
        descriptor: 'no.nav.navno:page-large-table',
        customized: true,
        config: {
            'no-nav-navno': {

            },
        },
    },
};

const searchResult = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: false,
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        layout: {
            descriptor: 'no.nav.navno:search',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0/searchbar/0',
        part: {
            descriptor: 'no.nav.navno:searchbar',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0/result/0',
        part: {
            descriptor: 'no.nav.navno:searchresult',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

const publishingCalendarPage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:page-crumbs',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:publishing-calendar',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

const genericPage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:page-crumbs',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:generic-page',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

const errorPage = [
    {
        type: 'page',
        path: '/',
        page: {
            descriptor: 'no.nav.navno:main-page',
            customized: true,
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:page-crumbs',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main-1-col',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:404',
            config: {
                'no-nav-navno': {

                },
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
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/0',
        part: {
            descriptor: 'no.nav.navno:page-crumbs',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'layout',
        path: '/main/1',
        layout: {
            descriptor: 'no.nav.navno:main',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/first/0',
        part: {
            descriptor: 'no.nav.navno:office-information',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

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
            displayName: 'Page - Ekstra Stor Tabell',
            parentPath: '/content/_templates/',
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
            displayName: 'Søkeresultat',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:searchresult',
            },
        },
        components: searchResult,
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
            displayName: 'Generisk side',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:generic-page',
            },
        },
        components: genericPage,
    },
    {
        content: {
            displayName: '404',
            parentPath: '/www.nav.no/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:404',
            },
        },
        components: errorPage,
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
