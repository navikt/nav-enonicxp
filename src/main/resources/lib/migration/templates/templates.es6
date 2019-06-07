var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var nodeLib = require('/lib/xp/node');
var repo = nodeLib.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});

exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('do', function (message) {
        createTemplates(socket);
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
    context.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        function () {
            templates.forEach(function (value) {
                var parent = content.get({
                    key: value.content.parentPath,
                });
                if (!parent) {
                    parent = content.create({
                        displayName: 'Templates',
                        parentPath: value.content.parentPath.replace('_templates/', ''),
                        name: '_templates',
                        contentType: 'portal:template-folder',
                        data: {

                        },
                    });
                }
                var exists = content.get({
                    key:
                        value.content.parentPath +
                        value.content.displayName
                            .toLowerCase()
                            .replace(/ - /g, '-')
                            .replace(/ /g, '-')
                            .replace(/ø/g, 'o'),
                });
                var elem = exists || content.create(value.content);
                repo.modify({
                    key: elem._id,
                    editor: function (c) {
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
    );
}

var tavleListePage = [
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
            descriptor: 'no.nav.navno:page-heading-with-menu',
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
            descriptor: 'no.nav.navno:main',
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
            descriptor: 'no.nav.navno:tavleliste',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/2/second/0',
        part: {
            descriptor: 'no.nav.navno:tavleliste-relatert-innhold',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/footer/0',
        part: {
            descriptor: 'no.nav.navno:page-footer',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

var mainArticlePage = [
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
            descriptor: 'no.nav.navno:page-heading-with-menu',
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
            descriptor: 'no.nav.navno:main',
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
            descriptor: 'no.nav.navno:main-article',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/2/second/0',
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
        path: '/main/2/second/1',
        part: {
            descriptor: 'no.nav.navno:main-article-related-content',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/footer/0',
        part: {
            descriptor: 'no.nav.navno:page-footer',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

var transportPage = [
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
            descriptor: 'no.nav.navno:page-heading-with-menu',
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
            descriptor: 'no.nav.navno:1-col',
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
            descriptor: 'no.nav.navno:transport',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/footer/0',
        part: {
            descriptor: 'no.nav.navno:page-footer',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

var hovedSeksjonPage = [
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
            descriptor: 'no.nav.navno:page-heading-with-menu',
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
            descriptor: 'no.nav.navno:driftsmelding-heading',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/2',
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
        path: '/main/3',
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
        path: '/main/3/first/0',
        part: {
            descriptor: 'no.nav.navno:oppslagstavle',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/footer/0',
        part: {
            descriptor: 'no.nav.navno:page-footer',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

var ekstraStorTabell = {
    type: 'page',
    path: '/',
    page: {
        descriptor: 'no.nav.navno:ekstraStorTabell',
        customized: true,
        config: {
            'no-nav-navno': {

            },
        },
    },
};

var searchResult = [
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
        part: {
            descriptor: 'no.nav.navno:page-heading-with-menu',
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
            descriptor: 'no.nav.navno:search',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/main/1/searchbar/0',
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
        path: '/main/1/result/0',
        part: {
            descriptor: 'no.nav.navno:searchresult',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/footer/0',
        part: {
            descriptor: 'no.nav.navno:page-footer',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

var publishingCalendarPage = [
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
            descriptor: 'no.nav.navno:page-heading-with-menu',
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
            descriptor: 'no.nav.navno:main',
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
            descriptor: 'no.nav.navno:publishing-calendar',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
    {
        type: 'part',
        path: '/footer/0',
        part: {
            descriptor: 'no.nav.navno:page-footer',
            config: {
                'no-nav-navno': {

                },
            },
        },
    },
];

var templates = [
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
                supports: 'no.nav.navno:tavleliste',
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
                supports: 'no.nav.navno:oppslagstavle',
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
                supports: 'no.nav.navno:transport',
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
                supports: 'no.nav.navno:Ekstra_stor_tabell',
            },
        },
        components: ekstraStorTabell,
    },
    {
        content: {
            displayName: 'Page - Ekstra Stor Tabell',
            parentPath: '/content/_templates/',
            requireValid: true,
            contentType: 'portal:page-template',
            branch: 'draft',
            data: {
                supports: 'no.nav.navno:Ekstra_stor_tabell',
            },
        },
        components: ekstraStorTabell,
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
                supports: 'no.nav.navno:generic-page',
            },
        },
        components: publishingCalendarPage,
    },

];
