const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    menu: require('/lib/menu'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('page-crumbs.html');

function handleGet (req) {
    return libs.cache.getPaths(req.path, 'breadCrumbs', () => {
        const content = libs.portal.getContent();
        const langBundles = libs.lang.parseBundle(content.language).pagenav.breadcrumbs;
        let breadcrumbs = libs.menu.getBreadcrumbMenu({
            linkActiveItem: false,
            showHomepage: false,
        });
        // Vise brødsmulesti bare når du er under nivå 3 (hovedseksjon)
        if (breadcrumbs.items.length <= 3) {
            breadcrumbs = undefined;
        } else {
            // Ta vekk de øverste to nivåene: <hjem>/<språk>
            breadcrumbs.items = breadcrumbs.items.slice(2);
            // Tar ikke med mapper fordi disse ikke har noen sidevisning knyttet til seg (kan ikke navigere hit)
            breadcrumbs.items = breadcrumbs.items.reduce((t, el) => {
                if (el.type !== app.name + ':magic-folder' && el.type !== 'base:folder') {
                    t.push(el);
                }
                return t;
            }, []);
        }
        const model = {
            langBundles,
            breadcrumbs,
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    });
}

exports.get = handleGet;
