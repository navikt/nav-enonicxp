var libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    // util: require('/lib/enonic/util'),
    i18n: require('/lib/xp/i18n'),
    menu: require('/lib/menu'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
var view = resolve('page-heading-with-menu.html');
// TODO: URL-er skal være konfigurerbare
var serviceurl = 'https://tjenester.nav.no';
var urls = {
    baseurl: serviceurl,
    login: serviceurl + '/oversikt',
    logout: serviceurl + '/esso/logout',
    stillinger: serviceurl + '/stillinger/',
    sok: serviceurl + '/nav-sok',
};

function handleGet (req) {
    var content = libs.portal.getContent();
    var language = content.language || 'no';

    return libs.cache.getDecorator('header' + language, undefined, function () {
        var languageBundles = libs.lang.parseBundle(language).pagenav;
        var assets = {
            img: {
                logo: libs.portal.assetUrl({
                    path: 'img/navno/logo.svg',
                }),
                idporten: libs.portal.assetUrl({
                    path: 'img/navno/gfx/icons/idporten_ikon.png',
                }),
            },
        };
        var megaMenu = libs.menu.getMegaMenu(libs.content.get({
            key: '/www.nav.no/megamenu/' + language,
        }), 4);

        // Må ha tre separate kall på pageUrl for å sikre korrekt url (caches)
        // TODO: Fjerne eksplesitt https når dette er løst på BigIP
        var languageSelectors = [
            {
                href: libs.portal.pageUrl({
                    type: 'absolute', path: '/www.nav.no/no',
                }).replace('http:', 'https:'),
                title: 'Norsk (Globalt språkvalg)',
                text: 'Norsk',
                active: (language === 'no' ? 'active' : ''),
            },
            {
                href: libs.portal.pageUrl({
                    type: 'absolute', path: '/www.nav.no/en',
                }).replace('http:', 'https:'),
                title: 'English (Globalt språkvalg)',
                text: 'English',
                active: (language === 'en' ? 'active' : ''),
            },
            {
                href: libs.portal.pageUrl({
                    type: 'absolute', path: '/www.nav.no/se',
                }).replace('http:', 'https:'),
                title: 'Sámegiella (Globalt Språkvalg)',
                text: 'Sámegiella',
                active: (language === 'se' ? 'active' : ''),
            },
        ];
        var model = {
            assets: assets,
            urls: urls,
            langBundles: languageBundles,
            langSelectors: languageSelectors,
            menu: megaMenu,
            regionNorth: content.page.regions['region-north'],
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    });
}

exports.get = handleGet;
