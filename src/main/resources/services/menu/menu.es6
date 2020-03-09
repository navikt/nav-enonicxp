const libs = {
    content: require('/lib/xp/content'),
    portal: require('/lib/xp/portal'),
    cache: require('/lib/siteCache'),
    menuUtils: require('/lib/menu-utils'),
};

const handleGet = req =>
    libs.cache.getPaths(req.rawPath, 'decorator-menu', req.branch, () => {
        const menu = libs.menuUtils.getMegaMenu({
            content: libs.content.get({ key: '/www.nav.no/dekorator-meny/' }),
            levels: 10,
        });

        return { body: menu, contentType: 'application/json' };
    });

exports.get = handleGet;
