var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var navUtils = require('/site/lib/nav-utils');

exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('megaMenu', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            handleMegaMenu(socket);
        })
    });
}

function createElements() {
    return {
        isNew: true,
        head: 'MegaMenu',
        body: {
            elements: [{
                tag: 'div',
                tagClass: ['row'],
                elements: [
                    {
                        tag: 'span',
                        text: 'Generer menyen basert på cms2xp-data'
                    },
                    {
                        tag: 'progress',
                        tagClass: ['progress', 'is-info'],
                        id: 'megamenu',
                        progress: {
                            value: 'megamenu-value',
                            max: 'megamenu-max',
                            valId: 'megamenu-val-id'
                        }
                    },
                    {
                        tag: 'button',
                        tagClass: ['button', 'is-info'],
                        action: 'megaMenu',
                        text: 'Generer meny'
                    }
                ]
            }]
        }
    }
}

function handleMegaMenu(socket) {
    log.info('Starter');
    var siteContent = content.get({key:'/www.nav.no/'});
    getSubMenus('/www.nav.no/megamenu', siteContent, 4)
}

var getSubMenus = function (path, parentContent, levels) {
    levels--;
    return content.getChildren({
            key: parentContent._id,
            count: 200
        }).hits.forEach(function(el) {
            if (isMenuItem(el)) {
                menuItemToMenuContent(path, el, levels);
            }
    });
};

function menuItemToMenuContent(path, element, levels) {
    var menuContent;
    var menuItem = element.x['no-nav-navno']['menu-item'];

    try {
        menuContent = content.create({
            parentPath: path,
            contentType: 'no.nav.navno:megamenu-item',
            displayName: (menuItem.menuName && menuItem.menuName.length ? menuItem.menuName : element.displayName),
            branch: 'draft',
            data: {
                itemContent: element._id
            }
        });
        log.info('Opprettet ' + menuContent._path)
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
function isMenuItem(content) {
    var extraData = content.x;
    if (!extraData) {
        return false;
    }
    var extraDataModule = extraData['no-nav-navno'];
    if (!extraDataModule || !extraDataModule['menu-item']) {
        return false;
    }
    var menuItemMetadata = extraDataModule['menu-item'] || {};

    return (menuItemMetadata['menuItem'] && !excludeFromMainMenu(content));
}
/**
 * Checks if the content is excluded from the menu (From NAV cms page parameter 'exclude-from-mainmenu').
 * @param {Content} content - content object obtained with 'portal.getContent', 'portal.getSite' or any 'content.*' commands
 * @return {Boolean} true if the content should be excluded from the menu
 */
function excludeFromMainMenu(content) {
    return (navUtils.getParameterValue(content, 'exclude-from-mainmenu') === 'true');
}