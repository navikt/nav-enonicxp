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
};

function importLinks (socket) {
    const linkFile = libs.io.getResource('/lib/migration/translate/links.csv');
    if (linkFile.exists()) {
        const stream = linkFile.getStream();
        const lines = libs.io.readLines(stream);
        socket.emit('import-links-max', lines.length);

        const links = [];

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
    } else {
        log.info('links.csv not found');
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

            // move all children from article to cms2xpPage
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
        // find all references to the article
        const refs = libs.tools.getRefs(articleId);
        // update with closest cms2xp_page if there are more than one
        refs.forEach((ref) => {
            // split ref and cms2xp_page paths on / and update ref to point to the cms2xp_page with the most matching path parts
            let cms2xpPage;
            let pathMatches = 0;
            const refPaths = ref._path.split('/');
            cms2xpPages.forEach((c) => {
                const cms2xpPaths = c._path.split('/');
                let currentCms2xpPagePathMatches = 0;
                // count matching path parts
                for (let i = 0; i < cms2xpPaths.length; i += 1) {
                    if (cms2xpPaths[i] !== refPaths[i]) {
                        break;
                    }
                    currentCms2xpPagePathMatches = i + 1;
                }
                // update cms2xp_page if its a better match then the preceeding cms2xp_pages
                if (currentCms2xpPagePathMatches > pathMatches) {
                    pathMatches = currentCms2xpPagePathMatches;
                    cms2xpPage = c;
                }
            });
            // use the first if there are no matches
            if (!cms2xpPage) {
                cms2xpPage = cms2xpPages[0];
            }
            // update refs from article id to cms2xp_page id in ref
            libs.tools.modify(
                libs.content.get({
                    key: ref._id,
                }),
                cms2xpPage._id,
                articleId
            );
        });

        // delete article
        libs.content.delete({
            key: articleId,
        });
    }
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

    // update all references from old to new
    libs.contentTranslator.updateRefs();
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
            ],
        },
    };
}
