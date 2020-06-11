import { getUrlFromTable } from './url-lookup-table';

const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    io: require('/lib/xp/io'),
};

/**
 * Returns the full breadcrumb menu path for the current content and site.
 * @param {Object} params - A JSON object containing the (optional) settings for the function.
 * @param {Boolean} [params.linkActiveItem=false] - Wrap the active (current
 * content) item with a link.
 * @param {Boolean} [params.showHomepage=true] - Disable return of item for the site homepage.
 * @param {String} [params.homepageTitle=null] - Customize (overwrite) the
 * displayName of home/site link (if used). Common usage: "Home" or "Start".
 * @param {String} [params.dividerHtml=null] - Any custom html you want appended
 * to each item, except the last one. Common usage: '<span
 * class="divider">/</span>'.
 *   @param {String} [params.urlType=null] - Control type of URL to be generated
 *   for menu items, default is 'server', only other option is 'absolute'.
 * @returns {Object} - The set of breadcrumb menu items (as array) and needed settings.
 */
exports.getBreadcrumbMenu = function(params) {
    const content = libs.portal.getContent();
    const site = libs.portal.getSite();
    const breadcrumbItems = []; // Stores each menu item
    const breadcrumbMenu = {}; // Stores the final JSON sent to Thymeleaf

    // Safely take care of all incoming settings and set defaults, for use in current scope only
    const settings = {
        linkActiveItem: params.linkActiveItem || false,
        showHomepage: params.showHomepage || true,
        homepageTitle: params.homepageTitle || null,
        dividerHtml: params.dividerHtml || null,
        urlType: params.urlType || null,
    };

    // We only allow 'server' or 'absolute' options for URL type.
    if (settings.urlType) {
        switch (settings.urlType) {
            case 'absolute':
                break; // Pass through
            default:
                settings.urlType = 'server';
        }
    }

    // Loop the entire path for current content based on the slashes. Generate
    // one JSON item node for each item. If on frontpage, skip the path-loop
    if (content._path !== site._path) {
        const fullPath = content._path;
        const arrVars = fullPath.split('/');
        const arrLength = arrVars.length;
        for (let i = 1; i < arrLength - 1; i++) {
            // Skip first item - the site - since it is handled separately.
            const lastVar = arrVars.pop();
            if (lastVar !== '') {
                const curItem = libs.content.get({
                    key: arrVars.join('/') + '/' + lastVar,
                }); // Make sure item exists
                if (curItem) {
                    const item = {};
                    const curItemUrl = libs.portal.pageUrl({
                        path: curItem._path,
                        type: settings.urlType,
                    });
                    item.text = curItem.displayName;
                    if (content._path === curItem._path) {
                        // Is current node active?
                        item.active = true;
                        if (settings.linkActiveItem) {
                            // Respect setting for creating links for active item
                            item.url = curItemUrl;
                        }
                    } else {
                        item.active = false;
                        item.url = curItemUrl;
                    }
                    item.type = curItem.type;
                    breadcrumbItems.push(item);
                }
            }
        }
    }

    // Add Home button linking to site home, if wanted
    if (settings.showHomepage) {
        const homeUrl = libs.portal.pageUrl({
            path: site._path,
            type: settings.urlType,
        });
        // Fallback to site displayName if no custom name given
        breadcrumbItems.push({
            text: settings.homepageTitle || site.displayName,
            url: homeUrl,
            active: content._path === site._path,
            type: site.type,
        });
    }

    // Add divider html (if any) and reverse the menu item array
    breadcrumbMenu.divider = settings.dividerHtml || null;
    breadcrumbMenu.items = breadcrumbItems.reverse();

    return breadcrumbMenu;
};

const getMegaMenu = ({ content, levels }) => {
    const menuToJson = (menuContent, menuLevel) => {
        let subMenus = [];
        let path = '';

        if (menuLevel > 0) {
            subMenus = getMegaMenu({
                content: menuContent,
                levels: menuLevel,
            });
        }
        if (menuContent.data.target) {
            const target = libs.content.get({
                key: menuContent.data.target,
            });
            // don't include elements which are unpublished
            if (!target) {
                return false;
            }
            // get the correct path
            path = libs.portal.pageUrl({
                id: menuContent.data.target,
            });

            if (target && target.type === `${app.name}:external-link`) {
                path = target.data.url;
            }
        }

        return {
            displayName: menuContent.displayName,
            path: app.config.env === 'p' ? path : getUrlFromTable(path),
            displayLock: menuContent.data.displayLock,
            id: menuContent._id,
            hasChildren: subMenus.length > 0,
            children: subMenus,
        };
    };

    const subMenus = [];
    if (content) {
        const currentLevel = levels - 1;
        return libs.content
            .getChildren({
                key: content._id,
                start: 0,
                count: 100,
            })
            .hits.reduce((t, el) => {
                const item = menuToJson(el, currentLevel);
                if (item) {
                    t.push(item);
                }
                return t;
            }, subMenus);
    }
    return [];
};

exports.getMegaMenu = getMegaMenu;
