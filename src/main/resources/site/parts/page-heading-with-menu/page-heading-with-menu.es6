const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    menu: require('/lib/menu'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
};
const view = resolve('page-heading-with-menu.html');

function handleGet(req) {
    const content = libs.portal.getContent();
    const language = content.language || 'no';

    return libs.cache.getDecorator(
        `header-${language}-${req.branch}`,
        undefined,
        req.branch,
        () => {
            const langBundles = libs.lang.parseBundle(language).pagenav;
            // Finn eventuell seksjonsside jeg tilhører (path: /site/språk/seksjonsside/...)
            // TODO: Denne må bli smartere
            const path = content._path.split('/');
            const level3 = (path[3] ? path[3] : '').toLowerCase();
            let seksjonsSider = '';
            switch (level3) {
                case 'person':
                case 'bedrift':
                case 'nav-og-samfunn':
                    seksjonsSider = level3;
                    break;
                default:
            }

            const assets = [
                '<link rel="alternate" type="application/rss+xml" title="Nyheter fra nav.no" href="/no/rss">',
                '<link rel="apple-touch-icon" href="' +
                    libs.portal.assetUrl({
                        path: 'img/navno/logo.png',
                    }) +
                    '" />',
                '<link rel="shortcut icon" type="image/x-icon" href="' +
                    libs.portal.assetUrl({
                        path: 'img/navno/favicon.ico',
                    }) +
                    '" />',
                '<link rel="stylesheet" href="' +
                    libs.portal.assetUrl({
                        path: 'styles/navno.css',
                    }) +
                    '" />',
                '<style>.async-hide{opacity:0!important}</style><script src="' +
                    libs.portal.assetUrl({
                        path: '/js/optimize.js',
                    }) +
                    '"></script>',
                '<script src="' +
                    libs.portal.assetUrl({
                        path: 'libs/modernizr.2.7.1.min.js',
                    }) +
                    '"></script>',
                '<script src="' +
                    libs.portal.assetUrl({
                        path: 'js/innloggingslinjen.min.js',
                    }) +
                    '"></script>',
                '<script id="navno-props" src="' +
                    libs.portal.assetUrl({
                        path: 'js/navno-page.js',
                    }) +
                    '" seksjonssider="' +
                    seksjonsSider +
                    '" authServiceUrl="' +
                    (app.config.authServiceUrl
                        ? app.config.authServiceUrl
                        : 'https://www.nav.no/innloggingslinje-api/auth') +
                    '"></script>',
                '<script async src="' +
                    libs.portal.assetUrl({
                        path: 'js/navno.js',
                    }) +
                    '"></script>', // TODO: Lage ny navno.min.js og bruke den
            ];
            const img = {
                logo: libs.portal.assetUrl({
                    path: 'img/navno/logo.svg',
                }),
                idporten: libs.portal.assetUrl({
                    path: 'img/navno/gfx/icons/idporten_ikon.png',
                }),
            };
            const siteUrl = '/www.nav.no/';
            const urls = {
                homeUrl: libs.portal.pageUrl({
                    path: siteUrl,
                }),
                baseUrl: app.config.baseUrl || 'https://tjenester.nav.no',
                login: app.config.loginUrl || 'https://tjenester.nav.no/dittnav/oversikt',
                logout: app.config.logoutUrl || 'https://loginservice.nav.no/slo',
                sok: '/sok',
            };
            let menuLanguage = language;
            if (language === 'pl') {
                menuLanguage = 'en';
            } else if (language !== 'en' && language !== 'se') {
                menuLanguage = 'no';
            }
            const menu = libs.menu.getMegaMenu(
                libs.content.get({
                    key: siteUrl + 'megamenu/' + menuLanguage,
                }),
                4
            );
            const subMenus = menuLanguage !== 'se';

            // Må ha tre separate kall på pageUrl for å sikre korrekt url (caches)
            const langSelectors = [
                {
                    href: libs.portal.pageUrl({
                        path: siteUrl + 'no',
                    }),
                    title: 'Norsk (Globalt språkvalg)',
                    text: 'Norsk',
                    active: menuLanguage === 'no' ? 'active' : '',
                },
                {
                    href: libs.portal.pageUrl({
                        path: siteUrl + 'en',
                    }),
                    title: 'English (Globalt språkvalg)',
                    text: 'English',
                    active: menuLanguage === 'en' ? 'active' : '',
                },
                {
                    href: libs.portal.pageUrl({
                        path: siteUrl + 'se',
                    }),
                    title: 'Sámegiella (Globalt Språkvalg)',
                    text: 'Sámegiella',
                    active: menuLanguage === 'se' ? 'active' : '',
                },
            ];
            const model = {
                img,
                urls,
                langBundles,
                langSelectors,
                menu,
                subMenus,
                regionNorth: content.page.regions['region-north'],
            };

            return {
                contentType: 'text/html',
                body: libs.thymeleaf.render(view, model),
                pageContributions: {
                    headEnd: assets,
                },
            };
        }
    );
}

exports.get = handleGet;
