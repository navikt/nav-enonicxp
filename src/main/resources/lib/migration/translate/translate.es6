const libs = {
    content: require('/lib/xp/content'),
    contentTranslator: require('/lib/migration/contentTranslator'),
    tools: require('/lib/migration/tools'),
    navUtils: require('/lib/nav-utils'),
};

const translateContentAZ = require('./translateContentAZ');
const translateLinks = require('./translateLinks');

exports.handle = function (socket) {
    socket.emit('newTask', createElements());
    socket.on('main', () => {
        libs.tools.runInContext(socket, updateMainOppslagstavle);
    });
    socket.on('artikkel_brukerportal', () => {
        libs.tools.runInContext(socket, translateMissingArtikkelBrukerportal);
    });
    socket.on('kort_om', () => {
        libs.tools.runInContext(socket, translateMissingKortOm);
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

/**
 * @description Translate artikkel brukerportal that was missed by main translate
 * @param socket
 */
function translateMissingArtikkelBrukerportal (socket) {
    let r = [];
    let start = 0;
    let count = 100;
    while (count === 100) {
        const h = libs.content.query({
            start: start,
            count: count,
            contentTypes: [app.name + ':Artikkel_Brukerportal'],
        }).hits;
        r = r.concat(h);
        count = h.length;
        start += count;
    }
    socket.emit('artikkel_brukerportalmax', r.length);

    r.forEach((article, index) => {
        const newArticle = libs.contentTranslator.translateArtikkelBrukerportalToMainArticle(article, '/www.nav.no/tmp');
        libs.contentTranslator.commonTranslate(article, newArticle);
        socket.emit('artikkel_brukerportalval', index + 1);
    });
}

/**
 * @description Translate kort om that was missed by main translate
 * @param socket
 */
function translateMissingKortOm (socket) {
    let r = [];
    let start = 0;
    let count = 100;
    while (count === 100) {
        const h = libs.content.query({
            start: start,
            count: count,
            contentTypes: [app.name + ':Kort_om'],
        }).hits;
        r = r.concat(h);
        count = h.length;
        start += count;
    }
    socket.emit('kort_ommax', r.length);

    r.forEach((kortOm, index) => {
        const newArticle = libs.contentTranslator.translateKortOmToMainArticle(kortOm, '/www.nav.no/tmp');
        libs.contentTranslator.commonTranslate(kortOm, newArticle);
        socket.emit('kort_omval', index + 1);
    });
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
                            text: 'Artikkel_Brukerportal',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'artikkel_brukerportal',
                            progress: {
                                value: 'artikkel_brukerportalval',
                                max: 'artikkel_brukerportalmax',
                                valId: 'artikkel_brukerportalvalue',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'artikkel_brukerportalbutton',
                            action: 'artikkel_brukerportal',
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
                            text: 'Kort_om',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'kort_om',
                            progress: {
                                value: 'kort_omval',
                                max: 'kort_ommax',
                                valId: 'kort_omvalue',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            id: 'kort_ombutton',
                            action: 'kort_om',
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
