const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
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
        app.name + ':guide-page',
        app.name + ':themed-article-page',
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
