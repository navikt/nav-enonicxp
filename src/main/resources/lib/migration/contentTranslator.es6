const libs = {
    content: require('/lib/xp/content'),
    navUtils: require('/lib/nav-utils'),
    tools: require('/lib/migration/tools'),
    node: require('/lib/xp/node'),
    value: require('/lib/xp/value'),
};

const repo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});

const oldToNewRefMap = {
    // id map of all translated content
};

exports.translateContent = translateContent;
/**
 * @description takes in an old content type and translates it into a new content type. Will translate other content that references the content as well
 * @param {object} content
 * @returns {object} new content, or the same object if nothing got translated
 */
function translateContent (content) {
    log.info('TRANSLATE :: ' + content._path + ' :: ' + content.type);
    let newContent = content;
    // section-page
    if (
        content.type === app.name + ':cms2xp_section' &&
        (content.page.template === libs.tools.getTemplate('person-seksjonsforside-niva-1') ||
            content.page.template === libs.tools.getTemplate('person-seksjonsside-niva-2'))
    ) {
        newContent = translateCms2xpSectionToOppslagstavle(content);
    }

    if (content.type === app.name + ':Artikkel_Brukerportal') {
        newContent = translateArtikkelBrukerportalToMainArticle(content, getTmpParentPath(content));
    }

    if (content.type === app.name + ':Kort_om') {
        newContent = translateKortOmToMainArticle(content, getTmpParentPath(content));
    }

    if (content.type === app.name + ':nav.nyhet') {
        newContent = translateNavNyhetToMainArticle(content);
    }

    if (content.type === app.name + ':nav.pressemelding') {
        newContent = translateNavPressemeldingToMainArticle(content);
    }

    if (content.type === app.name + ':Ekstern_lenke') {
        newContent = translateEksternLenke(content);
    }

    if (content.type === app.name + ':url') {
        newContent = translateUrl(content);
    }

    if (content.type === app.name + ':nav.lenke-med-ikon') {
        newContent = translateNavSnarveiMedIkon(content);
    }

    if (content.type === 'base:shortcut' || content.type === app.name + ':nav.snarvei') {
        newContent = translateShortcut(content);
    }

    if (
        content.type === app.name + ':cms2xp_section' &&
        content.page &&
        content.page.template &&
        (content.page.template === libs.tools.getTemplate('artikkelliste-med-sidebeskrivelse-subseksjon') ||
            content.page.template === libs.tools.getTemplate('artikkelliste-for-pressemeldinger-subseksjon'))
    ) {
        newContent = translateCms2xpSectionToTavleliste(content);
    }

    if (content.type === app.name + ':cms2xp_section' &&
        content.page &&
        content.page.template &&
        content.page.template === libs.tools.getTemplate('skriv-til-oss-temavelger-lenkeliste')
    ) {
        newContent = translateCms2xpSectionToLinkList(content);
    }

    // TODO: do this after everything else is translated
    if (content.type === app.name + ':cms2xp_page') {
        // newContent = translateCms2xpPageToMainArticle(content);
    }

    if (content.type === app.name + ':nav.rapporthandbok') {
        newContent = translateNavRapportHandbok(content);
    }

    if (content.type === app.name + ':nav.rapporthandbok.kap') {
        newContent = translateNavRapportHandbokKap(content);
    }

    if (content.type === app.name + ':Rapport_handbok') {
        newContent = translateRapportHandbok(content);
    }

    if (content === newContent) {
        log.info('NOT TRANSLATED');
        const folder = libs.content.create({
            displayName: content.displayName,
            name: content._name,
            contentType: 'base:folder',
            parentPath: '/www.nav.no/tmp/',
            branch: 'draft',
            data: {

            },
        });

        log.info('GET CHILDREN');
        const children = libs.content.getChildren({
            key: content._id,
            start: 0,
            count: 10000,
        }).hits;

        log.info('MOVE CHILDREN');
        children.forEach(child => {
            libs.content.move({
                source: child._id,
                target: folder._path + '/',
            });
        });

        log.info('MOVE CONTENT TO NEW');
        libs.content.move({
            source: content._id,
            target: getTmpParentPath(content),
        });

        // TODO set old sort order

        log.info('MOVE FOLDER TO OLD');
        libs.content.move({
            source: folder._id,
            target: content._path,
        });
    } else {
        oldToNewRefMap[content._id] = newContent._id;
    }

    return newContent;
}

function getTmpParentPath (content) {
    const contentPathArr = content._path.split('/');
    const site = contentPathArr[1];
    const hasFolder = libs.content.get({
        key: `/www.nav.no/tmp/${site}`,
    });
    if (!hasFolder) {
        libs.content.create({
            displayName: `${site}`,
            contentType: 'base:folder',
            parentPath: '/www.nav.no/tmp/',
            branch: 'draft',
            data: {

            },
        });
    }
    contentPathArr[1] = `/www.nav.no/tmp/${site}`;
    return contentPathArr.slice(0, -1).join('/') + '/';
}

exports.updateRefs = updateRefs;
function updateRefs () {
    for (let oldId in oldToNewRefMap) {
        let newId = oldToNewRefMap[oldId];
        // find and update refs from old to new
        let references = libs.tools.getRefs({
            _id: oldId,
        });
        references.forEach(ref => {
            libs.tools.modify(ref, newId, oldId);
        });
        // clear ref key from map
        delete oldToNewRefMap[oldId];
    }
}

function translateSectionTypeToContentList (content, contentParam) {
    var CmsSectionKey = libs.navUtils.getContentParam(content, contentParam);
    if (!CmsSectionKey) {
        return null;
    }
    var section = libs.navUtils.getContentByMenuKey(CmsSectionKey);
    if (!section) {
        return null;
    }

    // update type on section from cms2xp section to content-list, and remove all non-existing elements in the section contents list
    repo.modify({
        key: section._id,
        editor: translateSectionToContentList,
    });

    return section._id;
}

function translateSectionToContentList (section) {
    var sectionContents = [];
    if (section.data.sectionContents) {
        sectionContents = libs.content
            .query({
                start: 0,
                count: 1000,
                filters: {
                    ids: {
                        values: section.data.sectionContents,
                    },
                },
            })
            .hits.map(function (el) {
                return el._id;
            });
    }
    section.data = {
        sectionContents: sectionContents,
    };
    section.type = app.name + ':content-list';
    return section;
}

function translateTables (content) {
    var tableElements = libs.tools.getTableElements(content) || [];
    var ntkElementId = translateSectionTypeToContentList(content, 'nicetoknow');
    var newElementId = translateSectionTypeToContentList(content, 'news');
    var scElementId = translateSectionTypeToContentList(content, 'shortcuts');

    return libs.tools.createNewTableContent(tableElements, ntkElementId, newElementId, scElementId, content);
}

function translateCms2xpSectionToTavleliste (cms2xpSection) {
    if (libs.tools.verifyPaths(cms2xpSection, ['data', 'sectionContents'])) {
        // find sidebeskrivelse children
        const children = libs.content.getChildren({
            key: cms2xpSection._id,
            start: 0,
            count: 1000,
        }).hits;

        // if it's only one, take the ingress, delete it and map all refs from it to this instead
        let sidebeskrivelseRef;
        const sidebeskrivelseChildren = children.filter(c => c.type === app.name + ':nav.sidebeskrivelse');
        if (sidebeskrivelseChildren.length === 1) {
            cms2xpSection.data.ingress = sidebeskrivelseChildren[0].data.description;
            libs.content.delete({
                key: sidebeskrivelseChildren[0]._id,
            });
            sidebeskrivelseRef = sidebeskrivelseChildren[0]._id;
        }

        // create new page-list
        let tavleliste = libs.content.create({
            name: cms2xpSection._name,
            displayName: cms2xpSection.displayName,
            parentPath: getTmpParentPath(cms2xpSection),
            contentType: 'no.nav.navno:page-list',
            data: cms2xpSection.data,
            x: getXData(cms2xpSection),
        });

        // map references from sidebeskrivelse to the new page-list
        if (sidebeskrivelseRef) {
            oldToNewRefMap[sidebeskrivelseRef] = tavleliste._id;
        }

        tavleliste = updateTimeAndOrder(cms2xpSection, tavleliste);
        return tavleliste;
    }
    return cms2xpSection;
}

/**
 * @description creates a new section-page based on the old cms2xp_section
 * @param {object} cms2xpSection
 * @returns {object} new content
 */
function translateCms2xpSectionToOppslagstavle (cms2xpSection) {
    // create new
    let oppslagstavle = libs.content.create({
        name: cms2xpSection._name,
        displayName: cms2xpSection.displayName,
        contentType: app.name + ':section-page',
        parentPath: getTmpParentPath(cms2xpSection),
        data: translateTables(cms2xpSection),
        x: getXData(cms2xpSection),
    });

    oppslagstavle = updateTimeAndOrder(cms2xpSection, oppslagstavle);

    // if it's not a main section, make all the tablecontents children of the old cms2xpSection, this will then be translated later
    if (cms2xpSection.page.template === libs.tools.getTemplate('person-seksjonsside-niva-2')) {
        moveFromContentSiteToContent(oppslagstavle.data.tableContents, cms2xpSection);
    }

    return oppslagstavle;
}

function translateCms2xpSectionToLinkList (cms2xpSection) {
    // get the link list data and description
    let oldLinkList = libs.content.get({
        key: cms2xpSection.data.sectionContents,
    });

    // create new link-list with cms2xpSection position and name, and with oldLinkList data
    let linkList = libs.content.create({
        name: cms2xpSection._name,
        displayName: cms2xpSection.displayName,
        contentType: app.name + ':link-list',
        parentPath: getTmpParentPath(cms2xpSection),
        data: {
            linkList: oldLinkList.data.linklist,
            description: oldLinkList.data.description,
        },
        x: getXData(cms2xpSection),
    });

    // move all links out from /content site
    // TODO this doesn't work untill the links are translated, so this has to be done after the translate
    // oldLinkList.data.linklist.forEach((linkId) => {
    //     let isMoved = false;
    //     let counter = 0;
    //     while (!isMoved) {
    //         try {
    //             isMoved = true;
    //             // only append counter if it has failed once
    //             let append = '';
    //             if (counter > 0) {
    //                 append = '_' + counter;
    //             }
    //             // check that the link exists, and to get the name
    //             const link = libs.content.get({
    //                 key: linkId,
    //             });
    //             // move the link, this might fail, and we'll get into the catch and try again with an increased counter
    //             if (link) {
    //                 log.info('MOVE LINK :: ' + linkId + ' :: ' + cms2xpSection._path + '/' + link._name + append);
    //                 libs.content.move({
    //                     source: linkId,
    //                     target: cms2xpSection._path + '/' + link._name + append,
    //                 });
    //             }
    //         } catch (e) {
    //             isMoved = false;
    //             counter += 1;
    //             log.info('ERROR MOVING LINK');
    //             log.info(e);
    //         }
    //     }
    // });

    linkList = updateTimeAndOrder(cms2xpSection, linkList);

    libs.content.delete({
        key: oldLinkList._id,
    });
    return linkList;
}

exports.translateArtikkelBrukerportalToMainArticle = translateArtikkelBrukerportalToMainArticle;
/**
 * @description creates a new main article based on the old Artikkel_Brukerportal
 * @param {object} artikkelBrukerportal
 * @returns {object} new content
 */
function translateArtikkelBrukerportalToMainArticle (artikkelBrukerportal, tmpParentPath) {
    // manipulate old content to better match the new content-type
    libs.tools.compose([
        libs.tools.changeTitle,
        libs.tools.changePreface,
        libs.tools.changeSocial,
        libs.tools.changeTilbakemelding,
        libs.tools.changeNewsSchemas,
        libs.tools.changeLinks,
        libs.tools.changeLaws,
        libs.tools.changeInternational,
        libs.tools.changeSelfService,
        libs.tools.changeLanguageVersions,
        libs.tools.changeFactPlacement,
        libs.tools.changeHideDate,
        libs.tools.mapReduceMenuItems,
        libs.tools.insertContentTypeMetaTag,
        libs.tools.removeImageSize,
    ])(artikkelBrukerportal);

    // create new main article based on the old article
    let mainArticle = libs.content.create({
        name: artikkelBrukerportal._name,
        displayName: artikkelBrukerportal.displayName,
        contentType: app.name + ':main-article',
        parentPath: tmpParentPath,
        data: artikkelBrukerportal.data,
        x: getXData(artikkelBrukerportal),
    });

    mainArticle = updateTimeAndOrder(artikkelBrukerportal, mainArticle);

    return mainArticle;
}

exports.translateKortOmToMainArticle = translateKortOmToMainArticle;
/**
 * @description create a new main article based on the old kort om article
 * @param {object} kortOm
 * @returns {object} new main article
 */
function translateKortOmToMainArticle (kortOm, tmpParentPath) {
    // manipulate old content to better match the new content-type
    libs.tools.compose([
        libs.tools.changeSocial,
        libs.tools.changeRates,
        libs.tools.changeTitle,
        libs.tools.changeNewsSchemas,
        libs.tools.changeMembership,
        libs.tools.changeInformation,
        libs.tools.changeProcedural,
        libs.tools.changeQA,
        libs.tools.changeInternational,
        libs.tools.changeNotifications,
        libs.tools.changeAppeals,
        libs.tools.changeLaws,
        libs.tools.changeSelfService,
        libs.tools.changeLanguageVersions,
        libs.tools.insertContentTypeMetaTag,
        libs.tools.changeTilbakemelding,
    ])(kortOm);

    // create new main article based on the old article
    const newKortOm = {
        name: kortOm._name,
        displayName: kortOm.displayName,
        contentType: app.name + ':main-article',
        parentPath: tmpParentPath,
        data: kortOm.data,
        x: getXData(kortOm),
    };

    // add table of contents to all kort_om main-articles
    newKortOm.data.hasTableOfContents = 'h3';
    let mainArticle = libs.content.create(newKortOm);
    mainArticle = updateTimeAndOrder(kortOm, mainArticle);

    return mainArticle;
}

/**
 * @description create a new main article based on the old nav nyhet
 * @param {object} navNyhet
 * @returns {object} new main article
 */
function translateNavNyhetToMainArticle (navNyhet) {
    // manipulate old content to better match the new content-type
    libs.tools.compose([
        libs.tools.changeTitle,
        libs.tools.changeHideDate,
        libs.tools.changePreface,
        libs.tools.changeSocial,
        libs.tools.changeNewsSchemas,
        libs.tools.changeLinks,
        libs.tools.changeFactPlacement,
        libs.tools.changeLanguageVersions,
        libs.tools.mapReduceMenuItems,
        libs.tools.insertContentTypeMetaTag,
        libs.tools.removeImageSize,
    ])(navNyhet);

    // create new main article based on the old article
    let mainArticle = libs.content.create({
        name: navNyhet._name,
        displayName: navNyhet.displayName,
        contentType: app.name + ':main-article',
        parentPath: getTmpParentPath(navNyhet),
        data: navNyhet.data,
        x: getXData(navNyhet),
    });

    mainArticle = updateTimeAndOrder(navNyhet, mainArticle);

    return mainArticle;
}

/**
 * @description create a new main article based on the old nav.pressemelding
 * @param {object} navPressemelding
 * @returns {object} new main article
 */
function translateNavPressemeldingToMainArticle (navPressemelding) {
    // manipulate old content to better match the new content-type
    libs.tools.compose([
        libs.tools.changeTitle,
        libs.tools.changeHideDate,
        libs.tools.changePreface,
        libs.tools.changeSocial,
        libs.tools.changeNewsSchemas,
        libs.tools.changeLinks,
        libs.tools.changeFactPlacement,
        libs.tools.changeLanguageVersions,
        libs.tools.insertContentTypeMetaTag,
        libs.tools.removeImageSize,
    ])(navPressemelding);

    // create new main article based on the old article
    let mainArticle = libs.content.create({
        name: navPressemelding._name,
        displayName: navPressemelding.displayName,
        contentType: app.name + ':main-article',
        parentPath: getTmpParentPath(navPressemelding),
        data: navPressemelding.data,
        x: getXData(navPressemelding),
    });

    mainArticle = updateTimeAndOrder(navPressemelding, mainArticle);

    return mainArticle;
}

function createLink (oldLink, description) {
    // try to convert url to id
    var urlInfo = libs.tools.getIdFromUrl(oldLink.data.url);
    // if it's an external link or an invalid internal link we're going to use external link
    if (urlInfo.external || urlInfo.invalid) {
        return libs.content.create({
            name: oldLink._name,
            displayName: oldLink.displayName,
            contentType: app.name + ':external-link',
            parentPath: getTmpParentPath(oldLink),
            data: {
                description: description,
                url: oldLink.data.url,
            },
            x: getXData(oldLink),
        });
    } else {
        // use internal link where we were able to find an id
        return libs.content.create({
            name: oldLink._name,
            displayName: oldLink.displayName,
            contentType: app.name + ':internal-link',
            parentPath: getTmpParentPath(oldLink),
            data: {
                description: description,
                target: urlInfo.refId,
            },
            x: getXData(oldLink),
        });
    }
}

function translateEksternLenke (externalLink) {
    // create a new link at the same place as the old one
    let newLink = createLink(externalLink, externalLink.data.list_description || '');
    newLink = updateTimeAndOrder(externalLink, newLink);

    return newLink;
}

function translateUrl (url) {
    // create a new link at the same place as the old one
    let newLink = createLink(url, '');
    newLink = updateTimeAndOrder(url, newLink);

    return newLink;
}

function translateNavSnarveiMedIkon (shortcut) {
    // create a new link at the same place as the old shortcut
    let newLink = createLink(shortcut, shortcut.data.description || '');
    newLink = updateTimeAndOrder(shortcut, newLink);

    return newLink;
}

function translateShortcut (shortcut) {
    // create a new link at the same place as the old shortcut
    let newLink = libs.content.create({
        name: shortcut._name,
        displayName: shortcut.displayName,
        contentType: app.name + ':internal-link',
        parentPath: getTmpParentPath(shortcut),
        data: {
            description: '',
            target: shortcut.data.target || shortcut.data.link,
        },
        x: getXData(shortcut),
    });
    newLink = updateTimeAndOrder(shortcut, newLink);

    return newLink;
}

exports.commonTranslate = commonTranslate;
/**
 * @description update references, move children, delete old content and move new content to correct position
 * @param {object} oldContent
 * @param {object} newContent
 */
function commonTranslate (oldContent, newContent) {
    try {
        // update references from old to new
        const refs = libs.tools.getRefs(oldContent);
        refs.forEach(ref => {
            libs.tools.modify(ref, newContent._id, oldContent._id);
        });

        // move all children from old to new and delete old
        log.info('MOVE CHILDREN AND DELETE OLD');
        libs.tools.deleteOldContent(oldContent, newContent._path);

        // move new to old path
        log.info('MOVE NEW TO OLD PATH');
        libs.content.move({
            source: newContent._id,
            target:
                oldContent._path
                    .split('/')
                    .slice(0, -1)
                    .join('/') +
                '/' +
                oldContent._name,
        });

        // update dates and child order
        updateTimeAndOrder(oldContent, newContent);
    } catch (e) {
        log.info('ERROR');
        log.info(e);
        log.info(oldContent._path + ' :: ' + newContent._path);
    }

    log.info('COMMON DONE');
    // return the new content directly from content lib to make sure paths etc are correct
    return libs.content.get({
        key: newContent._id,
    });
}

function updateTimeAndOrder (oldContent, newContent) {
    const newContentNode = repo.get(oldContent._id);

    repo.modify({
        key: newContent._id,
        editor: function (c) {
            // set child order
            c._childOrder = oldContent.childOrder;

            // order news and pressreleases by publish.first
            if (c.type === app.name + ':content-list' || c.type === app.name + ':page-list') {
                const validNames = ['nyheter', 'nyheiter', 'pressemeldinger', 'pressemelding'];
                if (validNames.indexOf(c._name.toLowerCase()) >= 0) {
                    c._childOrder = 'publish.first DESC';
                }
            }

            // keep manual order if any
            if (newContentNode && newContentNode._manualOrderValue) {
                c._manualOrderValue = newContentNode._manualOrderValue;
            }

            // set correct created, modified and publish dates
            if (oldContent.createdTime) {
                c.createdTime = libs.value.instant(oldContent.createdTime);
            }
            if (oldContent.modifiedTime) {
                c.modifiedTime = libs.value.instant(oldContent.modifiedTime);
            }
            if (oldContent.publish) {
                c.publish = oldContent.publish;
                if (oldContent.publish.first) {
                    c.publish.first = libs.value.instant(oldContent.publish.first);
                }
                if (oldContent.publish.from) {
                    c.publish.from = libs.value.instant(oldContent.publish.from);
                }
                if (oldContent.publish.to) {
                    c.publish.to = libs.value.instant(oldContent.publish.to);
                }
            }

            // set content in /en to english and /se to Northern Sami - davvisámegiella
            if (c._path.indexOf('/www.nav.no/en/') !== -1) {
                c.language = 'en';
            } else if (c._path.indexOf('/www.nav.no/se/') !== -1) {
                c.language = 'se_NO';
            }

            // set language to norwegian if it's missing
            if (!c.language) {
                c.language = 'no';
            }
            return c;
        },
    });

    return libs.content.get({
        key: newContent._id,
    });
}

/**
 * @description gets the x data from content and returns it without content home
 * @param {object} content
 * @returns {object} x data
 */
function getXData (content) {
    const x = content.x;

    if (!x['no-nav-navno']) {
        x['no-nav-navno'] = {

        };
    }

    x['no-nav-navno'].oldContentType = {
        type: content.type,
    };

    // remove content home, moveContentHome should have been run already, so this is unnecessary to keep and it clutters up the _references
    if (libs.tools.verifyPaths(content, ['x', 'no-nav-navno', 'cmsContent', 'contentHome'])) {
        delete x['no-nav-navno'].cmsContent.contentHome;
    }

    return x;
}

function moveFromContentSiteToContent (elements, contentObj) {
    log.info('MOVE FROM CONTENT');
    elements = elements ? (Array.isArray(elements) ? elements : [elements]) : [];
    elements.forEach(function (value) {
        var element = repo.get(value);
        if (element && element._path.split('/').indexOf('www.nav.no') === -1) {
            let done = false;
            let int = 2;
            while (!done) {
                done = true;
                try {
                    repo.move({
                        source: value,
                        target: '/content' + contentObj._path + '/' + element._name + int,
                    });
                } catch (e) {
                    log.info('COULD NOT MOVE ' + element._path + ' to /content' + contentObj._path + '/' + element._name + int);
                    log.info(e.code + '::' + e.message);
                    int += 1;
                    done = false;
                }
            }
        }
    });
}

exports.translateCms2xpPageToMainArticle = translateCms2xpPageToMainArticle;
function translateCms2xpPageToMainArticle (cms2xpPage) {
    // try to get content article
    if (libs.tools.verifyPaths(cms2xpPage, ['x', 'no-nav-navno', 'cmsMenu', 'content'])) {
        let article;
        try {
            article = libs.content.get({
                key: cms2xpPage.x['no-nav-navno'].cmsMenu.content,
            });
        } catch (e) {
            log.info('Could not find cms2xpPage content' + cms2xpPage.x['no-nav-navno'].cmsMenu.content);
        }

        // check if its possible to convert article to a new navno content-type
        if (article) {
            log.info('CMS2XPPAGE CONTENT ' + article._path + ' :: ' + article.type);
            const x = getXData(cms2xpPage);
            delete x['no-nav-navno'].cmsMenu.content;

            // keep menu params from original cms2xpPage
            const parameters = cms2xpPage.data.parameters;
            // take all data from article and add params
            let data = article.data;
            if (article.type === app.name + ':nav.sidebeskrivelse') {
                data = {
                    ingress: article.data.description,
                    text: ' ',
                };
            }

            if (parameters) {
                data.parameters = parameters;
            }
            data.contentType = 'lastingContent';

            // create new
            let newPage = libs.content.create({
                name: cms2xpPage._name,
                displayName: cms2xpPage.displayName,
                contentType: app.name + ':main-article',
                parentPath: '/www.nav.no/tmp',
                data,
                x,
            });

            // update refs, move children and delete old
            newPage = commonTranslate(cms2xpPage, newPage);

            return newPage;
        } else {
            log.info('Could not find cms2xpPage content' + cms2xpPage.x['no-nav-navno'].cmsMenu.content);
        }
    }
    return cms2xpPage;
}

function translateNavRapportHandbok (rapportHandbok) {
    // re-create nav rapport hanbok as a main article
    let mainArticle = libs.content.create({
        parentPath: getTmpParentPath(rapportHandbok),
        contentType: app.name + ':main-article',
        displayName: rapportHandbok.displayName,
        data: {
            ingress: rapportHandbok.data.preface,
            text: ' ',
            languages: rapportHandbok.data.languages,
            contentType: 'lastingContent',
        },
    });

    // create main-article-chapter elements as children of the main-article
    rapportHandbok.data.chapters.forEach(chapterId => {
        let chapter = libs.content.get({
            key: oldToNewRefMap[chapterId] ? oldToNewRefMap[chapterId] : chapterId,
        });
        if (chapter) {
            const name = chapter._name.replace(/\?/g, '');
            libs.content.create({
                parentPath: getTmpParentPath(rapportHandbok) + mainArticle._name + '/',
                contentType: app.name + ':main-article-chapter',
                displayName: chapter.displayName,
                name: name + '_kap',
                data: {
                    article: chapter._id,
                },
            });
        }
    });

    mainArticle = updateTimeAndOrder(rapportHandbok, mainArticle);

    return mainArticle;
}

function translateNavRapportHandbokKap (rapportHandbokKap) {
    libs.tools.compose([libs.tools.changeNewsSchemas, libs.tools.changeInformation, libs.tools.changeSocial])(rapportHandbokKap);

    let mainArticle = libs.content.create({
        parentPath: getTmpParentPath(rapportHandbokKap),
        contentType: app.name + ':main-article',
        displayName: rapportHandbokKap.displayName,
        data: {
            ingress: rapportHandbokKap.data.preface,
            text: rapportHandbokKap.data.text,
            menuListItems: rapportHandbokKap.data.menuListItems,
            social: rapportHandbokKap.data.social,
            contentType: 'lastingContent',
        },
    });

    mainArticle = updateTimeAndOrder(rapportHandbokKap, mainArticle);

    return mainArticle;
}

function getLinks (value) {
    if (value && value.data && value.data.links) {
        if (Array.isArray(value.data.links)) {
            return value.data.links
                .map(function (link) {
                    return link && link.contents ? link.contents : null;
                })
                .reduce(function (t, v) {
                    if (v) {
                        t.push(v);
                    }
                    return t;
                }, []);
        } else if (value.data.links.link && value.data.links.link.contents) {
            return [value.data.links.link.contents];
        }
    }
    return [];
}

function translateRapportHandbok (rapportHandbok) {
    let mainArticle = libs.content.create({
        parentPath: getTmpParentPath(rapportHandbok),
        contentType: app.name + ':main-article',
        displayName: rapportHandbok.displayName,
        data: {
            ingress: rapportHandbok.data.rapport_description,
            text: ' ',
            contentType: 'lastingContent',
            menuListItems: libs.tools.addMenuListItem(null, 'related-information', getLinks(rapportHandbok)),
        },
    });

    // create main articles for all rapports
    const rapports = Array.isArray(rapportHandbok.data.rapports.rapport)
        ? rapportHandbok.data.rapports.rapport
        : rapportHandbok.data.rapports.rapport
            ? [rapportHandbok.data.rapports.rapport]
            : [];

    rapports.forEach(function (rapport) {
        let rapportArticle = libs.content.create({
            parentPath: getTmpParentPath(rapportHandbok) + mainArticle._name + '/',
            contentType: app.name + ':main-article',
            displayName: rapport.subtitle,
            data: {
                text: rapport.text,
                ingress: ' ',
                contentType: 'lastingContent',
            },
        });
        const name = rapport.subtitle.replace(/\?/g, '');
        libs.content.create({
            parentPath: getTmpParentPath(rapportHandbok) + mainArticle._name + '/',
            contentType: app.name + ':main-article-chapter',
            displayName: rapport.subtitle,
            name: name + '_kap',
            data: {
                article: rapportArticle._id,
            },
        });
        updateTimeAndOrder(rapportHandbok, rapportArticle);
    });

    mainArticle = updateTimeAndOrder(rapportHandbok, mainArticle);

    return mainArticle;
}
