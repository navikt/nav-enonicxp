const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    io: require('/lib/xp/io'),
};

/**
 * Returns the full breadcrumb menu path for the current content and site.
 * @returns {Object} - The set of breadcrumb menu items (as array).
 */
exports.getBreadcrumbMenu = function (id) {
    const breadcrumbs = []; // Stores each menu item
    const typeFilter = [
        app.name + ':main-article',
        app.name + ':section-page',
        app.name + ':page-list',
        app.name + ':transport-page',
        app.name + ':generic-page',
        app.name + ':dynamic-page',
        app.name + ':content-page-with-sidemenus',
        app.name + ':situation-page',
        app.name + ':large-table',
    ];

    // Loop the entire path for current content based on the slashes. Generate
    // one JSON item node for each item. If on frontpage, skip the path-loop
    const arrVars = id.split('/');
    const arrLength = arrVars.length;
    for (let i = 3; i < arrLength - 1; i++) {
        // Skip three first items - the site, language, context - since it is handled separately.
        const lastVar = arrVars.pop();
        if (lastVar !== '') {
            const curItem = libs.content.get({
                key: arrVars.join('/') + '/' + lastVar,
            });
            // Make sure item exists
            if (curItem) {
                const item = {
                    title: curItem.displayName,
                    url: libs.portal.pageUrl({
                        path: curItem._path,
                    }),
                };
                if (typeFilter.some((type) => type === curItem.type)) {
                    breadcrumbs.push(item);
                }
            }
        }
    }
    return breadcrumbs.reverse();
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
            path: path,
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
