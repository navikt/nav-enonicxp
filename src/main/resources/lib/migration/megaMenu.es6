const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    navUtils: require('/lib/nav-utils'),
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
    socket.on('megaMenu', () => {
        libs.tools.runInContext(socket, handleMegaMenu);
    });
};

function createElements () {
    return {
        isNew: true,
        head: 'MegaMenu',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'span',
                            text: 'Generer menyen basert på cms2xp-data',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'megamenu',
                            progress: {
                                value: 'megamenu-value',
                                max: 'megamenu-max',
                                valId: 'megamenu-val-id',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'megaMenu',
                            text: 'Generer meny',
                        },
                    ],
                },
            ],
        },
    };
}

function handleMegaMenu (socket) {
    log.info('Starter');

    // create megamenu folder if it doesn't exist
    if (!libs.content.get({
        key: '/www.nav.no/megamenu',
    })) {
        libs.content.create({
            displayName: 'megamenu',
            contentType: 'base:folder',
            parentPath: '/www.nav.no',
            branch: 'draft',
            data: {

            },
        });
    }

    const siteContent = libs.content.get({
        key: '/www.nav.no/',
    });
    getSubMenus('/www.nav.no/megamenu', siteContent, 4);
    orderMenuItems();
}

function getSubMenus (path, parentContent, levels) {
    levels--;
    return libs.content
        .getChildren({
            key: parentContent._id,
            count: 200,
        })
        .hits.forEach((el) => {
            if (isMenuItem(el)) {
                menuItemToMenuContent(path, el, levels);
            }
        });
}

function menuItemToMenuContent (path, element, levels) {
    let menuContent;
    const menuItem = element.x['no-nav-navno']['menu-item'];

    try {
        menuContent = libs.content.create({
            parentPath: path,
            contentType: 'no.nav.navno:megamenu-item',
            displayName: menuItem.menuName && menuItem.menuName.length ? menuItem.menuName : element.displayName,
            branch: 'draft',
            data: {
                itemContent: element._id,
            },
        });
        log.info('Opprettet ' + menuContent._path);
    } catch (e) {
        if (e.code === 'contentAlreadyExists') {
            log.error(element.displayName + ' finnes fra før');
        } else {
            log.error('Unexpected error: ' + e.message);
        }
    }

    if (menuContent && levels > 0) {
        getSubMenus(menuContent._path, element, levels);
    }
}
/**
 * Checks if the content is a menu item.
 * @param {Content} content - content object obtained with 'portal.getContent', 'portal.getSite' or any 'content.*' commands
 * @return {Boolean} true if the content is marked as menu item
 */
function isMenuItem (content) {
    const extraData = content.x;
    if (!extraData) {
        return false;
    }
    const extraDataModule = extraData['no-nav-navno'];
    if (!extraDataModule || !extraDataModule['menu-item']) {
        return false;
    }
    const menuItemMetadata = extraDataModule['menu-item'] || {

    };

    return menuItemMetadata['menuItem'] && !excludeFromMainMenu(content);
}
/**
 * Checks if the content is excluded from the menu (From NAV cms page parameter 'exclude-from-mainmenu').
 * @param {Content} content - content object obtained with 'portal.getContent', 'portal.getSite' or any 'content.*' commands
 * @return {Boolean} true if the content should be excluded from the menu
 */
function excludeFromMainMenu (content) {
    return libs.navUtils.getParameterValue(content, 'exclude-from-mainmenu') === 'true';
}

/**
 * Order megamenu items correctly. Set manual order with a fallback to modifiedtime
 */
function orderMenuItems () {
    const menuItems = libs.content.query({
        start: 0,
        count: 500,
        query: 'type = "no.nav.navno:megamenu-item"',
    }).hits;

    menuItems.forEach((menuItem) => {
        repo.modify({
            key: menuItem._id,
            editor: (m) => {
                m._childOrder = '_manualordervalue DESC, modifiedtime ASC';
                return m;
            },
        });
    });
}
