const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    value: require('/lib/xp/value'),
    navUtils: require('/lib/nav-utils'),
    node: require('/lib/xp/node'),
};
const repo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});

exports.verifyPaths = verifyPaths;
/**
 * @description verify that a property path exists in the content object
 * @param {Object} content object to test
 * @param {Array<String>} keys path to test on content
 * @returns {Boolean} true if the path exists
 */
function verifyPaths (content, keys) {
    let tmp = content;
    return keys.reduce((hasKey, key) => {
        if (hasKey && tmp[key]) {
            tmp = tmp[key];
        } else {
            hasKey = false;
        }
        return hasKey;
    }, true);
}

exports.join = join;
/**
 * @description merge two objects
 * @param {Object} a
 * @param {Object} b
 */
function join (a, b) {
    const set = {
        a: {

        },
        b: {

        },
        u: {

        },
    };
    for (let k in a) {
        if (a.hasOwnProperty(k) && !b.hasOwnProperty(k)) {
            set.a[k] = a[k];
        } else if (a.hasOwnProperty(k) && b.hasOwnProperty(k)) {
            set.u[k] = [a[k], b[k]];
        }
    }
    for (let l in b) {
        if (!a.hasOwnProperty(l) && b.hasOwnProperty(l)) {
            set.b[l] = b[l];
        }
    }
    const ret = {

    };
    for (let m in set.a) {
        if (set.a.hasOwnProperty(m)) {
            ret[m] = set.a[m];
        }
    }
    for (let n in set.b) {
        if (set.b.hasOwnProperty(n)) {
            ret[n] = set.b[n];
        }
    }
    for (let o in set.u) {
        if (set.u.hasOwnProperty(o)) {
            ret[o] = set.u[o];
        }
    }
    return ret;
}

exports.changeSocial = changeSocial;
/**
 * @description update socials on content from old to new structure
 * @param {Object} content
 */
function changeSocial (content) {
    const ret = [];
    if (content.data.hasOwnProperty('share-facebook')) {
        if (content.data['share-facebook']) {
            ret.push('facebook');
        }
        delete content.data['share-facebook'];
    }
    if (content.data.hasOwnProperty('share-twitter')) {
        if (content.data['share-twitter']) {
            ret.push('twitter');
        }
        delete content.data['share-twitter'];
    }
    if (content.data.hasOwnProperty('share-linkedin')) {
        if (content.data['share-linkedin']) {
            ret.push('linkedin');
        }
        delete content.data['share-linkedin'];
    }
    if (ret.length !== 0) {
        content.data.social = ret;
    }
    return content;
}

exports.changeTilbakemelding = changeTilbakemelding;
/**
 * @description remove "vis-tilbakemelding" from content
 * @param {Object} content
 */
function changeTilbakemelding (content) {
    // content.data.tilbakemelding = content.data['vis-tilbakemelding'];
    delete content.data['vis-tilbakemelding'];
    return content;
}

exports.changeNewsSchemas = changeNewsSchemas;
/**
 * @description update news schemas on content from old to new structure
 * @param {Object} content
 */
function changeNewsSchemas (content) {
    content.data.menuListItems = content.data.menuListItems || [];
    let ns = content.data.newsschemas;
    if (!Array.isArray(ns)) {
        ns = [ns];
    }
    content.data.menuListItems = addMenuListItem(
        content.data.menuListItems,
        'form-and-application',
        ns.reduce((t, el) => {
            if (el) {
                t.push(el);
            }
            return t;
        }, [])
    );
    delete content.data.newschemas;
    if (content.data.forms) {
        delete content.data.forms;
    }
    return content;
}

exports.changeLaws = changeLaws;
/**
 * @description update laws on content from old to new structure
 * @param {Object} content
 */
function changeLaws (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'rules-and-regulations', content.data.laws);
    delete content.data.laws;
    return content;
}

exports.changeInternational = changeInternational;
/**
 * @description update international on content from old to new structure
 * @param {Object} content
 */
function changeInternational (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'international', content.data.international);
    delete content.data.international;
    return content;
}

exports.changeProcedural = changeProcedural;
/**
 * @description update "saksbehandling" on content from old to new structure
 * @param {Object} content
 */
function changeProcedural (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'process-times', content.data.saksbehandling);
    delete content.data.saksbehandling;
    return content;
}

exports.changeSelfService = changeSelfService;
/**
 * @description update self service on content from old to new structure
 * @param {Object} content
 */
function changeSelfService (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'selfservice', content.data.selfservice);
    delete content.data.selfservice;
    return content;
}

exports.changeLanguageVersions = changeLanguageVersions;
/**
 * @description remove language from content
 * @param {Object} content
 */
function changeLanguageVersions (content) {
    delete content.data.language;
    return content;
}

exports.changeMembership = changeMembership;
/**
 * @description update membership on content from old to new structure
 * @param {Object} content
 */
function changeMembership (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'membership', content.data.membership);
    delete content.data.membership;
    return content;
}

exports.changeQA = changeQA;
/**
 * @description remove Q&A on content
 * @param {Object} content
 */
function changeQA (content) {
    delete content.data.faq;
    return content;
}

exports.changeNotifications = changeNotifications;
/**
 * @description update notifications on content from old to new structure
 * @param {Object} content
 */
function changeNotifications (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'report-changes', content.data.notifications);
    delete content.data.notifications;
    return content;
}

exports.changeAppeals = changeAppeals;
/**
 * @description update appeal rights on content from old to new structure
 * @param {Object} content
 */
function changeAppeals (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'appeal-rights', content.data.appeals);
    delete content.data.appeals;
    return content;
}

exports.changeHideDate = changeHideDate;
/**
 * @description remove hide_date from content
 * @param {Object} content
 */
function changeHideDate (content) {
    delete content.data['hide_date'];
    return content;
}

/**
 * @description checks if the link is valid
 * @param {any} link
 */
function isLink (link) {
    if (!link) {
        return link;
    } else if (typeof link === 'string') {
        return link;
    } else {
        return link.length;
    }
}

exports.mapReduceMenuItems = mapReduceMenuItems;
/**
 * @description remove invalid menu items or menu items without links
 * @param {Object} content
 */
function mapReduceMenuItems (content) {
    let selected;
    if (content && content.data && content.data.menuListItems && content.data.menuListItems._selected) {
        selected = content.data.menuListItems._selected;
    }
    if (!selected) {
        return content;
    }
    selected = Array.isArray(selected) ? selected : [selected];
    selected.forEach(value => {
        if (!isLink(content.data.menuListItems[value].link)) {
            delete content.data.menuListItems[value];
        }
    });
    return content;
}

/**
 * @description add meta tag to content
 * @param {Object} content
 * @param {String} key metatag key (contentType)
 * @param {String} value metatag value (old contentType)
 */
function insertMetaTag (content, key, value) {
    content.data.metaTags = content.data.metaTags || [];
    if (!Array.isArray(content.data.metaTags)) {
        content.data.metaTags = [content.data.metaTags];
    }
    content.data.metaTags.push(key + '$$$' + value);
    return content;
}

exports.insertContentTypeMetaTag = insertContentTypeMetaTag;
/**
 * @description add content type meta tag and contentType to data for future reference and cleanup
 * @param {Object} content
 */
function insertContentTypeMetaTag (content) {
    // content = insertMetaTag(content, 'contentType', content.type.replace(app.name + ':', ''));
    // add content type to main-articles
    if (content.type === app.name + ':Kort_om') {
        content.data.contentType = 'fact';
    } else if (content.type === app.name + ':nav.nyhet') {
        content.data.contentType = 'news';
    } else if (content.type === app.name + ':pressemelding') {
        content.data.contentType = 'pressRelease';
    } else {
        content.data.contentType = 'lastingContent';
    }
    return content;
}

exports.changePreface = changePreface;
/**
 * @description move data.preface into data.ingress
 * @param {Object} content
 */
function changePreface (content) {
    content.data.ingress = content.data.preface;
    delete content.data.preface;
    return content;
}

exports.changeTitle = changeTitle;
/**
 * @description remove old title/heading, we're just using displayname not title/heading
 * @param {Object} content
 */
function changeTitle (content) {
    // content.data.heading = content.data.title;
    delete content.data.heading;
    delete content.data.title;
    return content;
}

exports.changeLinks = changeLinks;
/**
 * @description move links into menuListItems -> related-information
 * @param {Object} content
 */
function changeLinks (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.links);
    delete content.data.links;
    return content;
}

exports.changeInformation = changeInformation;
/**
 * @description move information links into menuListItems -> related-information
 * @param {Object} content
 */
function changeInformation (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.information);
    delete content.data.information;
    return content;
}

exports.changeRates = changeRates;
/**
 * @description move rates links into menuListItems -> rates
 * @param {Object} content
 */
function changeRates (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'rates', content.data.rates);
    delete content.data.rates;
    return content;
}

exports.changeFactPlacement = changeFactPlacement;
/**
 * @description delete fact_placement on content
 * @param {Object} content
 */
function changeFactPlacement (content) {
    // content.data.factLocation = content.data.fact_placement;
    // if (content.data.factLocation === 'sidebar') {
    //     content.data.factLocation = 'left';
    // } else if (content.data.factLocation === 'maincol') {
    //     content.data.factLocation = 'bottom';
    // }
    delete content.data.fact_placement;
    return content;
}

/**
 * @description remove null|undefined from array
 * @param {Array<any>} t
 * @param {any} el
 */
function reduceNullElements (t, el) {
    if (el) {
        t.push(el);
    }
    return t;
}

/**
 * @description to be used in map to an array of ._ids from content
 * @param {Object} el
 */
function mapIds (el) {
    if (el) {
        return el._id;
    }
    return null;
}

exports.logBeautify = logBeautify;
/**
 * @description safe log for objects, arrays, strings etc
 * @param {Object} content
 */
function logBeautify (content) {
    let contentString = '';
    if (!content) {
        contentString = 'content undefined';
    } else if (typeof content !== 'object') {
        contentString = content;
    } else {
        contentString = JSON.stringify(content, null, 4);
    }
    log.info(contentString);
}

exports.changeDescription = changeDescription;
/**
 * @description move description into ingress
 * @param {Object} content
 */
function changeDescription (content) {
    content.data.ingress = content.data.description;
    delete content.data.description;
    return content;
}

exports.changeShortcuts = changeShortcuts;
/**
 * @description move shortcut links into menuListItems -> related-information
 * @param {Object} content
 */
function changeShortcuts (content) {
    content.data.menuListItems = addMenuListItem(content.data.menuListItems, 'related-information', content.data.shortcuts);
    delete content.data.shortcuts;
    return content;
}

exports.createNewTableContent = createNewTableContent;
/**
 * @description Creates the data object for "section-page" with news, nice to know, shortcuts and table contents
 * @param {Array<Object>} tableElements
 * @param {string} ntkElementId id to ntk content list
 * @param {string} newElementId id to news content list
 * @param {string} scElementId id to shortcuts content list
 */
function createNewTableContent (tableElements, ntkElementId, newElementId, scElementId) {
    const data = {
        nrTableEntries: tableElements.length,
        tableContents: tableElements,
        nrNTK: 5,
        nrSC: 5,
        nrNews: 3,
    };
    if (ntkElementId) {
        data.ntkContents = ntkElementId;
    }
    if (newElementId) {
        data.newsContents = newElementId;
    }
    if (scElementId) {
        data.scContents = scElementId;
    }
    return data;
}

exports.getTableElements = getTableElements;
/**
 * @description creates a list of tableContents for "section-page"
 * @param {Object} content old cms2xp_section
 * @return {Array<Object>}
 */
function getTableElements (content) {
    if (!content) {
        return [];
    }
    if (typeof content.data.sectionContents === 'string') {
        content.data.sectionContents = [content.data.sectionContents];
    }

    return content.data.sectionContents
        ? libs.content
            .query({
                filters: {
                    ids: {
                        values: content.data.sectionContents,
                    },
                },
            })
            .hits.map(mapIds)
            .reduce(reduceNullElements, [])
        : [];
}

exports.moveNewContent = moveNewContent;
/**
 * @description move content to path
 * @param {object} newContent
 * @param {string} path
 */
function moveNewContent (newContent, path) {
    return libs.content.move({
        source: newContent._id,
        target:
            '/' +
            path
                .split('/')
                .slice(0, -1)
                .join('/') +
            '/',
    });
}

exports.getRefs = getRefs;
/**
 * @description gets all references to content
 * @param {object} content
 * @returns {Array<{object}>}
 */
function getRefs (content) {
    let re = [];
    let start = 0;
    const count = 20;
    let length = count;
    while (length === count) {
        const res = libs.content.query({
            start: start,
            count: count,
            query: '_references LIKE "' + content._id + '" AND x.no-nav-navno.cmsContent.contentHome NOT LIKE "' + content._id + '"',
        });
        re = re.concat(res.hits);
        length = res.count;
        start += count;
    }

    return re;
}

exports.deleteOldContent = deleteOldContent;
/**
 * @description moves all children of content to a new path and deletes content element
 * @param {object} content content element to delete
 * @param {string} newPath path to childrens new parent
 */
function deleteOldContent (content, newPath) {
    const children = repo
        .findChildren({
            parentKey: content._id,
            start: 0,
            count: 100,
        })
        .hits.map((c) => {
            return repo.get(c.id);
        });
    children.forEach((child) => {
        repo.move({
            source: child._id,
            target: '/content' + newPath + '/',
        });
    });
    libs.content.delete({
        key: content._id,
    });
}

exports.modify = modify;
/**
 * @description replaces old reference in value with a new reference
 * @param {object} value content to replace references on
 * @param {string} newId new reference id
 * @param {string} oldId old reference id
 */
function modify (value, newId, oldId) {
    try {
        repo.modify({
            key: value._id,
            editor: (c) => {
                log.info('*****UPDATED REFS ON  ' + c._path + '*****');
                log.info(oldId + ' => ' + newId);
                replaceIdInContent(c, oldId, newId);
                return c;
            },
        });
    } catch (e) {
        log.info(
            JSON.stringify(
                libs.content.get({
                    key: value._id,
                }),
                null,
                4
            )
        );
        log.info('Failed modify ' + e);
        log.info(oldId + ' ==> ' + newId);
    }
}

/**
 * @description loops recursively through content object and replaces oldId with newId
 * @param {object} content
 * @param {string} oldId
 * @param {string} newId
 */
function replaceIdInContent (content, oldId, newId) {
    if (typeof content === 'object') {
        // check arrays
        if (Array.isArray(content)) {
            content.forEach((arrayEl, index) => {
                const isIdObject = arrayEl.toString && arrayEl.toString() !== '[object Object]' && !Array.isArray(arrayEl);
                // replace the id if it's a string and it's more than just the id
                if (typeof arrayEl === 'string' && arrayEl.indexOf(oldId) !== -1 && arrayEl.length !== oldId.length) {
                    log.info('replace id in array at ' + index);
                    content[index] = arrayEl.replace(oldId, newId);
                } else if (isIdObject && arrayEl.toString() === oldId) {
                    // replace the reference if its a reference
                    content[index] = libs.value.reference(newId);
                    log.info('update with ref');
                } else if (typeof arrayEl === 'object') {
                    // keep looping recursively if it's an array of objects
                    replaceIdInContent(arrayEl, oldId, newId);
                }
            });
            // normal objects
        } else {
            for (let key in content) {
                const isIdObject = content[key].toString && content[key].toString() !== '[object Object]' && !Array.isArray(content[key]);
                // replace the id if the property is a string and if it's more than just the id
                if (typeof content[key] === 'string' && content[key].indexOf(oldId) !== -1 && content[key].length !== oldId.length) {
                    log.info('Found id in object at ' + key);
                    content[key] = content[key].replace(oldId, newId);
                } else if (isIdObject && content[key].toString() === oldId) {
                    // replace the reference if it's a reference
                    content[key] = libs.value.reference(newId);
                    log.info('update with ref');
                } else if (typeof content[key] === 'object') {
                    // keep looping recursively if the property is an object
                    replaceIdInContent(content[key], oldId, newId);
                }
            }
        }
    }
}

exports.addMenuListItem = addMenuListItem;
/**
 * @description add links to a named menu list
 * @param {object} menuListItems the complete menu list
 * @param {string} name the name of the list of links
 * @param {array<string>} links
 * @returns {object} the menu list complete with the new links
 */
function addMenuListItem (menuListItems, name, links) {
    links = links ? (Array.isArray(links) ? links : [links]) : [];
    if (!menuListItems) {
        menuListItems = {
            _selected: [],
        };
    }
    if (!menuListItems._selected) {
        menuListItems = {
            _selected: [],
        };
    }
    if (links.length > 0) {
        if (menuListItems._selected.indexOf(name) === -1) {
            menuListItems._selected.push(name);
        }
        menuListItems[name] = {
            link: Array.isArray(links) ? links : [links],
        };
    }
    return menuListItems;
}

exports.getIdFromUrl = getIdFromUrl;
/**
 * @description tries to find an id based on the url
 * @param url
 * @returns {{external: boolean, invalid: boolean, refId: string|null, pathTo: string|null}}
 */
function getIdFromUrl (url) {
    const ret = {
        external: true,
        invalid: false,
        refId: null,
        pathTo: null,
    };
    url = url.toLowerCase();
    if (url.indexOf('https://') !== -1 || url.indexOf('http://') !== -1) {
        url = url.replace(':443', '');
        if (url.indexOf('https://www.nav.no/') === 0 || url.indexOf('http://www.nav.no/') === 0) {
            ret.external = false;
            url = decodeURIComponent(url);
            url = url.replace(/\+/g, '-');
            url = url.replace(/,/g, '');
            url = url.replace(/å/g, 'a');
            url = url.replace(/ø/g, 'o');
            url = url.replace(/æ/g, 'ae');
            if (url.indexOf('?') > -1) {
                const urlSplitOnQuestionmark = url.split('?');
                if (urlSplitOnQuestionmark.length === 2) {
                    url = urlSplitOnQuestionmark[0];
                }
            }
            let cmsKey;
            if (url.indexOf('.cms') === url.length - 4) {
                url = url.replace('.cms', '');
                let urlSplit = url.split('.');
                let cms = urlSplit[urlSplit.length - 1];
                if (isNaN(parseInt(cms))) {
                    urlSplit = url.split('/');
                    cms = urlSplit[urlSplit.length - 1];
                    cmsKey = cms;
                    url = url.replace('/' + cms, '');
                } else {
                    cmsKey = cms;
                    url = url.replace('.' + cms, '');
                }
            }
            if (url.indexOf('/_attachment/') !== -1) {
                const urlSplitOnAttachment = url.split('/_attachment/');
                cmsKey = urlSplitOnAttachment[urlSplitOnAttachment.length - 1];
            }
            let path = url.replace('https://', '/').replace('http://', '/');

            let c;
            if (cmsKey) {
                const hits = libs.content.query({
                    start: 0,
                    count: 10,
                    query: 'x.no-nav-navno.cmsContent.contentKey LIKE "' + cmsKey + '"',
                }).hits;
                if (hits.length === 1) {
                    c = hits[0];
                }
            }
            if (!c) {
                let count = 0;
                let useCount = false;
                while (count < 10 && !c) {
                    let testPath = path;
                    if (!useCount) {
                        useCount = true;
                    } else {
                        testPath += '_' + count;
                        count += 1;
                    }
                    c = libs.content.get({
                        key: testPath,
                    });
                    if (c) {
                        path = testPath;
                    }
                }
            }

            ret.pathTo = path;
            if (c) {
                ret.refId = c._id;
            } else {
                ret.invalid = true;
            }
        }
    }

    return ret;
}

exports.getUrlsInContent = getUrlsInContent;
/**
 * @description finds all urls in an element
 * @param {object} element
 * @returns {array<string>} list of urls found
 */
function getUrlsInContent (elem) {
    const dataString = JSON.stringify(elem.data);
    const urls = [];
    let match;

    const hrefPtrn = /href=\\"(.*?)\\"/g;
    while ((match = hrefPtrn.exec(dataString)) != null) {
        const url = match[1];// we only care about group 1, not the whole match
        if (url.indexOf('https://') === 0 || url.indexOf('http://') === 0) {
            urls.push(url);
        }
    }
    return urls;
}

exports.runInContext = runInContext;
/**
 * @description run a function in admin context on the draft branch
 * @param socket socket to pass into func as a param
 * @param func the function to run
 */
function runInContext (socket, func) {
    libs.context.run(
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
            func(socket);
        }
    );
}

exports.removeImageSize = removeImageSize;
/**
 * @description removes imagesize from data on content
 * @param {Object} content
 */
function removeImageSize (content) {
    if (content.data.imagesize === '') {
        delete content.data.imagesize;
    }
    return content;
}

exports.compose = compose;
/**
 * @description get a new function that runs a series of functions in order and sends the return into the next function
 * @param {array<function>} functions
 */
function compose (functions) {
    const emptyFunc = v => v;
    return initialVal => functions.reduce((val, fn) => (fn ? fn(val) : emptyFunc(val)), initialVal);
}

exports.getTemplate = getTemplate;
function getTemplate (templateName) {
    let r = libs.content.query({
        query: '_name LIKE "' + templateName + '"',
    });
    if (!r.hits[0]) {
        r = libs.content.get({
            key: '/www.nav.no/_templates/' + templateName,
        });
    }
    return r.hits[0]._id;
}
