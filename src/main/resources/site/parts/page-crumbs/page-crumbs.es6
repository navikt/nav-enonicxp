var libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    menu: require('/lib/menu'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
var view = resolve('page-crumbs.html');

function handleGet (req) {
    return libs.cache.getPaths(req.path, 'breadCrumbs', function () {
        var content = libs.portal.getContent();
        var langBundles = libs.lang.parseBundle(content.language).pagenav.breadcrumbs;
        var breadcrumbs = libs.menu.getBreadcrumbMenu({
            linkActiveItem: false,
            showHomepage: false,
        });
        // Tar vekk de første tre nivåene: <hjem>/<språk>/<seksjon>
        if (breadcrumbs.items.length >= 3) {
            breadcrumbs.items = breadcrumbs.items.slice(3);
            // Tar ikke med mapper fordi disse ikke har noen sidevisning knyttet til seg
            breadcrumbs.items = breadcrumbs.items.reduce(function (t, el) {
                if (el.type !== app.name + ':magic-folder' && el.type !== 'base:folder') {
                    t.push(el);
                }
                return t;
            }, []);
        }
        var model = {
            langBundles: langBundles,
            breadcrumbs: breadcrumbs,
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    });
}

exports.get = handleGet;
