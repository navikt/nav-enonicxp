var libs = {
	thymeleaf: require('/lib/xp/thymeleaf'),
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	util: require('/lib/enonic/util'),
    i18n: require('/lib/xp/i18n'),
    menu: require('/lib/menu'),
    lang: require('/lib/i18nUtil'),
    tools: require('/lib/tools'),
    cache: require('/lib/cacheControll')
};
var view = resolve('page-heading-with-menu.html');
//TODO: URL-er skal være konfigurerbare
var serviceurl = 'https://tjenester.nav.no';
var urls = {
    baseurl: serviceurl,
    login: serviceurl + '/oversikt',
    logout: serviceurl + '/esso/logout',
    stillinger: serviceurl + '/stillinger/',
    sok: serviceurl + '/nav-sok',
};

function handleGet(req) {
    var site = libs.portal.getSite();
    var content = libs.portal.getContent();
    return libs.cache.getDecorator('header' + (content.language ? content.language : 'no'), function () {
        var languageBundles = libs.lang.parseBundle(content.language).pagenav;
        var assets = {
            img: {
                logo: libs.portal.assetUrl({path: 'img/navno/logo.svg'}),
                idporten: libs.portal.assetUrl({path: 'img/navno/gfx/icons/idporten_ikon.png'})
            }
        };
        var menuItems = libs.menu.getSubMenus(site, 4);
        var language = content.language || 'no';
        menuItems = menuItems[menuItems.findIndex(function (value) {
            return value.name === language;
        })];

        // Må ha tre separate kall på pageUrl for å sikre korrekt url (caches)
        //TODO: Fjerne eksplesitt https når dette er løst på BigIP
        var languageSelectors = [
            {
                href: libs.portal.pageUrl({type: "absolute", path: "/www.nav.no/no"}).replace("http:", "https:"),
                title: 'Norsk (Globalt språkvalg)',
                text: 'Norsk',
                active: (language === 'no' ? 'active' : '')
            },
            {
                href: libs.portal.pageUrl({type: "absolute", path: "/www.nav.no/en"}).replace("http:", "https:"),
                title: 'English (Globalt språkvalg)',
                text: 'English',
                active: (language === 'en' ? 'active' : '')
            },
            {
                href: libs.portal.pageUrl({type: "absolute", path: "/www.nav.no/se"}).replace("http:", "https:"),
                title: 'Sámegiella (Globalt Språkvalg)',
                text: 'Sámegiella',
                active: (language === 'se' ? 'active': '')
            }
        ];
        var model = {
            assets: assets,
            urls: urls,
            langBundles: languageBundles,
            langSelectors: languageSelectors,
            menu: menuItems,
            regionNorth: content.page.regions['region-north']
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    })
}

exports.get = handleGet;

if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
        value: function(predicate) {
            if (this === null) {
                throw new TypeError('"this" is null or not defined');
            }
            var o = Object(this);
            var len = o.length >>> 0;
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var thisArg = arguments[1];
            var k = 0;
            while (k < len) {
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                    return k;
                }
                k++;
            }
            return -1;
        },
        configurable: true,
        writable: true
    });
}
