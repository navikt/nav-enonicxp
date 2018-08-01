var libs = {
	thymeleaf: require('/lib/xp/thymeleaf'),
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	menu: require('/lib/menu'),
	util: require('/lib/enonic/util')
};
var view = resolve('page-nav.html');

function handleGet(req) {
    var site = libs.portal.getSite();
    var content = libs.portal.getContent();

    var imageUrl = getImageUrl(content.data.text);
    imageUrl = (imageUrl ? imageUrl : libs.portal.assetUrl({path: '/img/navno/social-share-fallback.png'}));
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
    menuItems = menuItems[0];

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

    var model = {
		isEditMode: (req.mode === 'edit'),
        context: req,
        site: site,
        content: content,
        westRegionClass: regionsInEast && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        eastRegionClass: regionsInWest && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        centerRegionClass: regionsInEast && regionsInWest ? 'col-md-4' : (regionsInEast || regionsInWest ? 'col-md-8' : 'col-md-12'),
        frontPageUrl: libs.portal.pageUrl({id: site._id}),
        contentAZPage: libs.portal.serviceUrl({service: 'contentAZ'}),
        seksjonsSider: seksjonssider,
        accessibleLetters: 'abcdefghijklmnopqrstuvwxyzæøå'.split(''),
        menu: menuItems,
        breadcrumbs: breadcrumbs,
        bodyClassExtras: bodyClassExtras
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
        if (exec(fn, obj, key, thisObj) === false) {
            break;
        }
    }
    function exec(fn, obj, key, thisObj){
        return fn.call(thisObj, obj[key], key, obj);
    }
    return forIn;
}

function getImageUrl(text) {
	return null; //TODO: Hva skal være regel for deling av bilder?
}