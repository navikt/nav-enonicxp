var libs = {
	thymeleaf: require('/lib/xp/thymeleaf'),
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	menu: require('/lib/menu'),
	util: require('/lib/enonic/util'),
    i18n: require('/lib/xp/i18n')
};
var view = resolve('page-nav.html');
var lang = require('../../lib/i18nUtil');

function handleGet(req) {
    var site = libs.portal.getSite();
    var content = libs.portal.getContent();

    var langBundles = lang.parseBundle(content.language).pagenav;

    var imageUrl = libs.portal.imageUrl({id: content.data.image, scale: 'height(500)', type:'absolute'});
    imageUrl = (imageUrl.indexOf("/error/") === -1 ? imageUrl :
        libs.portal.assetUrl({path: '/img/navno/social-share-fallback.png', type:'absolute'}));
    var title = content.displayName + " - www.nav.no";
    var description = (content.data.ingress ? content.data.ingress :
		"NAV forvalter en tredjedel av statsbudsjettet gjennom ordninger som dagpenger, arbeidsavklaringspenger, " +
		"sykepenger, pensjon, barnetrygd og kontantstøtte."
    );
    var metadata = {
        "description": 			description,
		"og:sitename": 			"NAV",
        "og:type": 				"article",
        "og:title": 			title,
        "og:url": 				req.url.split('?')[0],
		"og:image":				imageUrl,
		"og:description": 		description,
		"twitter:card":			"summary_large_image",
        "twitter:domain": 		"nav.no",
        "twitter:title": 		title,
		"twitter:image:src":	imageUrl,
        "twitter:description": 	description
	};
    var metaTags = [];
    forIn(metadata, function(val, key){
    	metaTags.push(setMetaTag(key,val));
	});

    var menuItems = libs.menu.getSubMenus(site, 4);

    menuItems = menuItems[menuItems.findIndex(function (value) {
        var lang = content.language || 'no';
        return value.name === lang;
    })];

    log.info(JSON.stringify(menuItems, null, 4));

	var breadcrumbs = libs.menu.getBreadcrumbMenu({
		linkActiveItem: false,
		showHomepage: false
	});
	//Tar vekk de første tre nivåene: <hjem>/<språk>/<seksjon>
	if (breadcrumbs.items.length >= 3) {
		breadcrumbs.items = breadcrumbs.items.slice(3);
		//Tar ikke med mapper fordi disse ikke har noen sidevisning knyttet til seg
		breadcrumbs.items = breadcrumbs.items.reduce(function (t,el) {
            if (el.type !== app.name + ':magic-folder' && el.type !== 'base:folder') {
                t.push(el)
            }
            return t;
        }, []);
	}

	//Finn eventuell seksjonsside jeg tilhører (path: /site/språk/seksjonsside/...)
	//TODO: avklare komavdelingens krav til  GTM
	var path = content._path.split('/');
	var level3 = (path[3] ? path[3] : "").toLowerCase();
	var seksjonssider = "";
	switch ( level3 ) {
		case "person":
		case "bedrift":
		case "nav-og-samfunn":
			seksjonssider = level3;
			break;
		default:
	}

    var regionsInWest = content.page.regions['region-west'] && content.page.regions['region-west'].components.length > 0;
    var regionsInEast = content.page.regions['region-east'] && content.page.regions['region-east'].components.length > 0;
    var regionsInCenter = content.page.regions['region-center'] && content.page.regions['region-center'].components.length > 0;

	// TODO: Avklare behovet for en egen contentpage class, nå settes dette på alle sider
    var bodyClassExtras = "contentpage";

    var accessibleLetters = 'abcdefghijklmnopqrstuvwxyz';
    accessibleLetters += content.language === 'en' ? '' : 'æøå';

    var frontPageUrl = libs.portal.pageUrl({id: site._id})
    var languageSelectors = [
        {
            href: frontPageUrl + '/no',
            title: 'Norsk (Globalt språkvalg)',
            text: 'Norsk',
            active: !content.language || content.language === 'no' ? 'active' : ''
        },
        {
            href: frontPageUrl + '/en',
            title: 'English (Globalt språkvalg)',
            text: 'English',
            active: content.language === 'en' ? 'active' : ''
        },
        {
            href: frontPageUrl + '/se',
            title: 'Sámegiella (Globalt Språkvalg)',
            text: 'Sámegiella',
            active: content.language === 'se' ? 'active': ''
        }
    ]
    var model = {
        languageSelectors: languageSelectors,
		isEditMode: (req.mode === 'edit'),
        context: req,
        site: site,
        content: content,
        westRegionClass: regionsInEast && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        eastRegionClass: regionsInWest && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        centerRegionClass: regionsInEast && regionsInWest ? 'col-md-4' : (regionsInEast || regionsInWest ? 'col-md-8' : 'col-md-12'),
        frontPageUrl: frontPageUrl,
        contentAZPage: libs.portal.serviceUrl({service: 'contentAZ'}),
        seksjonsSider: seksjonssider,
        accessibleLetters: accessibleLetters.split(''),
        menu: menuItems,
        breadcrumbs: breadcrumbs,
        bodyClassExtras: bodyClassExtras,
        lang: langBundles
    };

    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model),
		pageContributions: {
        	headBegin: metaTags
		}
    };
}

exports.get = handleGet;

function setMetaTag(property, content) {
	var name = (property.indexOf("og:")>-1 ? "property" : "name");
	return "<meta " + name + "='" + property + "' content='" + content + "' />";
}

function forIn(obj, fn, thisObj) {
    var key;
    for (key in obj) {
        if (obj.hasOwnProperty(key) && exec(fn, obj, key, thisObj) === false) {
            break;
        }
    }
    function exec(fn, obj, key, thisObj){
        return fn.call(thisObj, obj[key], key, obj);
    }
    return forIn;
}

if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
        value: function(predicate) {
            if (this == null) {
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