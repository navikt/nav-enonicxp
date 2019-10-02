const libs = {
    content: require('/lib/xp/content'),
    contentTranslator: require('/lib/migration/contentTranslator'),
    tools: require('/lib/migration/tools'),
    navUtils: require('/lib/nav-utils'),
    officeInformation: require('/lib/officeInformation'),
    io: require('/lib/xp/io'),
};

const translateContentAZ = require('./translateContentAZ');
const translateLinks = require('./translateLinks');

exports.handle = function (socket) {
    socket.emit('newTask', createElements());
    socket.on('importLinks', () => {
        libs.tools.runInContext(socket, importLinks);
    });
    socket.on('importOfficeInformation', () => {
        libs.tools.runInContext(socket, importOfficeInformation);
    });
    socket.on('saveRefs', () => {
        libs.tools.runInContext(socket, saveRefs);
    });
    socket.on('main', () => {
        libs.tools.runInContext(socket, updateMainOppslagstavle);
    });
    socket.on('cms2xp_page', () => {
        libs.tools.runInContext(socket, updateCms2xpPage);
    });
    socket.on('contentAZ', () => {
        libs.tools.runInContext(socket, translateContentAZ.handleContentAZ);
    });
    socket.on('fixLinks', () => {
        libs.tools.runInContext(socket, translateLinks.handleLinks);
    });
    socket.on('createChapters', () => {
        libs.tools.runInContext(socket, createChapters);
    });
    socket.on('setTableOfContents', () => {
        libs.tools.runInContext(socket, setTableOfContents);
    });
};

let refMax = 0;
let refCount = 0;
function saveRefs (socket) {
    refMax = 0;
    refCount = 0;
    const navRepo = libs.tools.getNavRepo();

    const referencesContent = navRepo.get('/references');
    if (referencesContent) {
        navRepo.delete('/references');
    }

    navRepo.create({
        _name: 'references',
        parentPath: '/',
        refresh: true,
        data: {
        },
    });

    saveRefsToChildrenOf(libs.content.get({
        key: '/redirects',
    }), navRepo, socket);
    saveRefsToChildrenOf(libs.content.get({
        key: '/content',
    }), navRepo, socket);
    saveRefsToChildrenOf(libs.content.get({
        key: '/www.nav.no',
    }), navRepo, socket);
}

function saveRefsToChildrenOf (parent, navRepo, socket) {
    const children = libs.navUtils.getAllChildren(parent);

    refMax += children.length;
    socket.emit('save-refs-max', refMax);

    children.forEach(child => {
        libs.tools.saveRefs(child, navRepo);

        socket.emit('save-refs-value', ++refCount);
        saveRefsToChildrenOf(child, navRepo, socket);
    });
}

function importLinks (socket) {
    const links = [];

    // link map for broken links
    const linkFile = libs.io.getResource('/lib/migration/translate/links.csv');
    if (linkFile.exists()) {
        const stream = linkFile.getStream();
        const lines = libs.io.readLines(stream);
        socket.emit('import-links-max', lines.length);

        lines.forEach((line, index) => {
            if (index > 0) {
                const split = line.split(';');
                const url = split[0];
                const newPath = split[4];
                if (url && newPath) {
                    links.push({
                        url,
                        newPath,
                    });
                }
            }
            socket.emit('import-links-value', index + 1);
        });
    } else {
        log.info('links.csv not found');
    }

    // link map for invalid relative links in external links
    const externalLinksFile = libs.io.getResource('/lib/migration/translate/external-links.csv');
    if (externalLinksFile.exists()) {
        const stream = externalLinksFile.getStream();
        const lines = libs.io.readLines(stream);
        socket.emit('import-links-max', lines.length);

        lines.forEach((line, index) => {
            if (index > 0) {
                const split = line.split(';');
                const url = `http://www.nav.no${split[0]}`;
                const newPath = split[3];
                if (url && newPath) {
                    links.push({
                        url,
                        newPath,
                    });
                }
            }
            socket.emit('import-links-value', index + 1);
        });
    } else {
        log.info('external-links.csv not found');
    }

    if (links.length > 0) {
        const navRepo = libs.tools.getNavRepo();
        const linksContent = navRepo.get('/links');
        if (linksContent) {
            navRepo.delete('/links');
        }
        navRepo.create({
            _name: 'links',
            parentPath: '/',
            refresh: true,
            data: {
                links,
            },
        });
    }

    // map for "flere nyheter" link in section-page
    const sectionPageNewsLinksFile = libs.io.getResource('/lib/migration/translate/section-page-news-links.csv');
    if (sectionPageNewsLinksFile.exists()) {
        const sectionPageLinks = [];

        const stream = sectionPageNewsLinksFile.getStream();
        const lines = libs.io.readLines(stream);
        socket.emit('import-links-max', lines.length);

        lines.forEach((line, index) => {
            if (index > 0) {
                const split = line.split(';');
                const sectionPagePath = split[1];
                const url = split[2];
                if (url) {
                    sectionPageLinks.push({
                        url: url.replace('https://www-x4.nav.no', ''),
                        sectionPagePath,
                    });
                }
            }
            socket.emit('import-links-value', index + 1);
        });

        const navRepo = libs.tools.getNavRepo();
        const sectionPageContent = navRepo.get('/sectionPageNewsLinks');
        if (sectionPageContent) {
            navRepo.delete('/sectionPageNewsLinks');
        }
        navRepo.create({
            _name: 'sectionPageNewsLinks',
            parentPath: '/',
            refresh: true,
            data: {
                sectionPageLinks,
            },
        });
    } else {
        log.info('section-page-news-links.csv not found');
    }
}

function importOfficeInformation (socket) {
    libs.officeInformation.submitCheckTask();
}

function updateCms2xpPage (socket) {
    // find all cms2xp_pages
    let r = [];
    let start = 0;
    let count = 100;
    while (count === 100) {
        const h = libs.content.query({
            start: start,
            count: count,
            contentTypes: [app.name + ':cms2xp_page'],
        }).hits;
        r = r.concat(h);
        count = h.length;
        start += count;
    }
    socket.emit('cms2xp_pagemax', r.length);

    // NOTE: Save all articles, delete them, and change refs after all cms2xp_pages are translated
    // This is because multiple cms2xp_pages link to the same article
    const articles = {
        // empty ref map for articles and new cms2xp pages
    };

    r.forEach((cms2xpPage, index) => {
        if (libs.tools.verifyPaths(cms2xpPage, ['x', 'no-nav-navno', 'cmsMenu', 'content'])) {
            log.info('TRANSLATE :: ' + cms2xpPage._path + ' :: ' + cms2xpPage.type);
            const articleKey = cms2xpPage.x['no-nav-navno'].cmsMenu.content;
            const newPage = libs.contentTranslator.translateCms2xpPageToMainArticle(cms2xpPage);

            // move all children from article to new page based on the old cms2xpPage
            const children = libs.content.getChildren({
                key: articleKey,
                start: 0,
                count: 100,
            }).hits;
            children.forEach(child => {
                libs.content.move({
                    source: child._id,
                    target: newPage._path + '/',
                });
            });

            // save which cms2xp pages have taken over the content in the original content article
            if (!articles[articleKey]) {
                articles[articleKey] = [];
            }
            articles[articleKey].push(newPage);
        }
        socket.emit('cms2xp_pageval', index + 1);
    });

    // delete all articles used by cms2xp_pages and update refs
    for (let articleId in articles) {
        const cms2xpPages = articles[articleId];
        libs.tools.updateModifyToRef(articleId, cms2xpPages[0]._id);

        // delete article
        libs.content.delete({
            key: articleId,
        });
    }

    libs.tools.updateRefsAfterMigration();
}

function updateMainOppslagstavle (socket) {
    // translate redirects folder
    translateChildrenOf(socket, '/redirects');
    deleteOldAndMoveNew('/redirects', '/www.nav.no/tmp/redirects');

    // translate www.nav.no site
    translateChildrenOf(socket, '/www.nav.no');
    deleteOldAndMoveNew('/www.nav.no', '/www.nav.no/tmp/www.nav.no');

    // translate content site
    translateChildrenOf(socket, '/content');
    deleteOldAndMoveNew('/content', '/www.nav.no/tmp/content');
}

function deleteOldAndMoveNew (contentKey, newContentKey) {
    let children = [];
    let start = 0;
    const count = 100;
    let length = count;
    while (count === length) {
        const hits = libs.content.getChildren({
            key: contentKey,
            start: start,
            count: count,
        }).hits;

        length = hits.length;
        start += length;

        children = children.concat(hits);
    }

    // delete old children, except tmp
    children.forEach(c => {
        if (c._path !== '/www.nav.no/tmp') {
            libs.content.delete({
                key: c._id,
            });
        }
    });

    start = 0;
    length = count;
    let newChildren = [];
    while (count === length) {
        const hits = libs.content.getChildren({
            key: newContentKey,
            start: start,
            count: count,
        }).hits;

        length = hits.length;
        start += length;

        newChildren = newChildren.concat(hits);
    }

    // move new children from tmp to site
    newChildren.forEach(c => {
        libs.content.move({
            source: c._id,
            target: contentKey + '/',
        });
    });
}

let max = 0;
let current = 0;
function translateChildrenOf (socket, contentKey) {
    // get all children
    const children = libs.navUtils.getAllChildren({
        _id: contentKey,
        hasChildren: true,
    });

    max += children.length;
    socket.emit('mainmax', max);
    children.forEach(child => {
        // translate all children except those in tmp
        if (child._path !== '/www.nav.no/tmp') {
            libs.contentTranslator.translateContent(child);
            translateChildrenOf(socket, child._path);
            current += 1;
        }
        socket.emit('mainval', current);
    });
}

function createChapters (socket) {
    const mainArticles = libs.content.query({
        start: 0,
        count: 100000,
        query: `type = "${app.name}:main-article"`,
    }).hits;

    socket.emit('create-chapters-max', mainArticles.length);
    mainArticles.forEach((mainArticle, index) => {
        const children = libs.navUtils.getAllChildren(mainArticle).reverse();
        children.forEach((child) => {
            if (child.type === `${app.name}:main-article`) {
                let exists = libs.content.get({
                    key: child._path + '_kap',
                });
                if (!exists) {
                    libs.content.create({
                        parentPath: mainArticle._path,
                        contentType: app.name + ':main-article-chapter',
                        displayName: child.displayName,
                        name: child._name + '_kap',
                        data: {
                            article: child._id,
                        },
                    });
                }
            }
        });
        socket.emit('create-chapters-value', index + 1);
    });
}

function setTableOfContents (socket) {
    const kortOmArticles = libs.content.query({
        start: 0,
        count: 1000,
        query: `x.no-nav-navno.oldContentType.type = "${app.name}:kort_om"`,
    }).hits;

    socket.emit('set-table-of-contents-max', kortOmArticles.length);

    kortOmArticles.forEach((article, index) => {
        libs.content.modify({
            key: article._id,
            editor: (a) => {
                a.data.hasTableOfContents = 'h3';
                return a;
            },
        });
        socket.emit('set-table-of-contents-value', index + 1);
    });
}

function createElements () {
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
                            text: 'Import Links',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'import-links',
                            progress: {
                                value: 'import-links-value',
                                max: 'import-links-max',
                                valId: 'import-links-val-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'import-links-button',
                            action: 'importLinks',
                            text: 'Import',
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
                            text: 'Office Information',
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'office-information-button',
                            action: 'importOfficeInformation',
                            text: 'Import',
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
                            text: 'Save refs',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'save-refs',
                            progress: {
                                value: 'save-refs-value',
                                max: 'save-refs-max',
                                valId: 'save-refs-val-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'save-refs-button',
                            action: 'saveRefs',
                            text: 'Save',
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
                            text: 'Main translate',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'main',
                            progress: {
                                value: 'mainval',
                                max: 'mainmax',
                                valId: 'maintranslateval',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'mainbutton',
                            action: 'main',
                            text: 'Translate',
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
                            text: 'Cms2Xp Page',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'cms2xp_page',
                            progress: {
                                value: 'cms2xp_pageval',
                                max: 'cms2xp_pagemax',
                                valId: 'sidebeskrivelseval',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'cms2xp_pagebutton',
                            action: 'cms2xp_page',
                            text: 'Translate',
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
                            tag: 'span',
                            text: 'Content A-Z',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'content-az',
                            progress: {
                                value: 'content-az-value',
                                max: 'content-az-max',
                                valId: 'content-az-val-id',
                            },
                        },
                        {
                            tag: 'p',
                            status: 'content-az-status',
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'contentAZ',
                            text: 'Translate',
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
                            tag: 'span',
                            text: 'Fix links',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'fix-links',
                            progress: {
                                value: 'fix-links-value',
                                max: 'fix-links-max',
                                valId: 'fix-links-val-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'fixLinks',
                            text: 'Translate',
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
                            tag: 'span',
                            text: 'Create chapters',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'create-chapters',
                            progress: {
                                value: 'create-chapters-value',
                                max: 'create-chapters-max',
                                valId: 'create-chapters-val-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'createChapters',
                            text: 'Create',
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
                            tag: 'span',
                            text: 'Add table of contents to kortOm',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'set-table-of-contents',
                            progress: {
                                value: 'set-table-of-contents-value',
                                max: 'set-table-of-contents-max',
                                valId: 'set-table-of-contents-val-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['is-info', 'button'],
                            action: 'setTableOfContents',
                            text: 'Add',
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
