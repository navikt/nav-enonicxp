const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    menu: require('/lib/menu'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('page-heading-with-menu.html');

function handleGet (req) {
    const content = libs.portal.getContent();
    const language = content.language || 'no';

    return libs.cache.getDecorator('header-' + language, undefined, req.branch, () => {
        const langBundles = libs.lang.parseBundle(language).pagenav;
        const assets = {
            img: {
                logo: libs.portal.assetUrl({
                    path: 'img/navno/logo.svg',
                }),
                idporten: libs.portal.assetUrl({
                    path: 'img/navno/gfx/icons/idporten_ikon.png',
                }),
            },
        };
        // TODO: URL-er skal være konfigurerbare
        const serviceUrl = 'https://tjenester.nav.no';
        const siteUrl = '/www.nav.no/';
        const urls = {
            homeUrl: libs.portal.pageUrl({
                path: siteUrl,
            }),
            baseUrl: serviceUrl,
            login: serviceUrl + '/oversikt',
            logout: serviceUrl + '/esso/logout',
            stillinger: serviceUrl + '/stillinger/',
            sok: serviceUrl + '/nav-sok',
        };
        const menu = libs.menu.getMegaMenu(libs.content.get({
            key: siteUrl + 'megamenu/' + language,
        }), 4);

        // Må ha tre separate kall på pageUrl for å sikre korrekt url (caches)
        const langSelectors = [
            {
                href: libs.portal.pageUrl({
                    path: siteUrl + 'no',
                }),
                title: 'Norsk (Globalt språkvalg)',
                text: 'Norsk',
                active: (language === 'no' ? 'active' : ''),
            },
            {
                href: libs.portal.pageUrl({
                    path: siteUrl + 'en',
                }),
                title: 'English (Globalt språkvalg)',
                text: 'English',
                active: (language === 'en' ? 'active' : ''),
            },
            {
                href: libs.portal.pageUrl({
                    path: siteUrl + 'se',
                }),
                title: 'Sámegiella (Globalt Språkvalg)',
                text: 'Sámegiella',
                active: (language === 'se' ? 'active' : ''),
            },
        ];
        const model = {
            assets,
            urls,
            langBundles,
            langSelectors,
            menu,
            regionNorth: content.page.regions['region-north'],
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    });
}

exports.get = handleGet;
