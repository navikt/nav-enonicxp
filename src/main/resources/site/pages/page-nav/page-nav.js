var libs = {
	thymeleaf: require('/lib/xp/thymeleaf'),
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	menu: require('/lib/menu'),
	util: require('/lib/enonic/util')
}
var view = resolve('page-nav.html');
var accessibleLetters = 'abcdefghijklmnopqrstuvwxyzæøå'.split('');

function handleGet(req) {
    var site = libs.portal.getSite();
    var content = libs.portal.getContent();

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

    var regionsInWest = content.page.regions['region-west'] && content.page.regions['region-west'].components.length > 0;
    var regionsInEast = content.page.regions['region-east'] && content.page.regions['region-east'].components.length > 0;
    var regionsInCenter = content.page.regions['region-center'] && content.page.regions['region-center'].components.length > 0;

	// TODO: Avklare behovet for en egen contentpage class, nå settes dette på alle sider
    var bodyClassExtras = "contentpage";

	var social = getSocial(content, req);
	log.info(JSON.stringify(social));
    var model = {
		isEditMode: (req.mode === 'edit'),
        context: req,
        site: site,
        content: content,
        westRegionClass: regionsInEast && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        eastRegionClass: regionsInWest && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        centerRegionClass: regionsInEast && regionsInWest ? 'col-md-4' : (regionsInEast || regionsInWest ? 'col-md-8' : 'col-md-12'),
        frontPageUrl: libs.portal.pageUrl({id: site._id}),
        contentAZPage: libs.portal.serviceUrl({service: 'contentAZ'}), // TODO make page parameter with default value
        accessibleLetters: accessibleLetters,
        menu: menuItems,
		  breadcrumbs: breadcrumbs,
		  bodyClassExtras: bodyClassExtras
    };

    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model),
		pageContributions: {
        	headBegin: social ? social : []
		}
    };
}

exports.get = handleGet;

function getSocial(content, req) {
	if (!content.data.social) return null;
	var social = Array.isArray(content.data.social) ? content.data.social : [content.data.social];
	return social.reduce(function (total, value) {
		if (value === 'facebook') {

			total.push(setOg('url', req.url.split('?')[0]));
			total.push(setOg('type', 'article'));
			total.push(setOg('title', content.displayName));
			total.push(setOg('description', content.data.ingress));
			total.push(setOg('image', libs.portal.assetUrl({path: 'beta.nav.no/images/social-share-fallback.png'})));
		}
		else if (value === 'twitter') {
			total.push(setOg('card', 'summary_large_image', 'name'));
			total.push(setOg('title', content.displayName, 'name'));
			total.push(setOg('description', content.data.ingress, 'name'));
			total.push(setOg('domain', 'nav.no', 'name'));
			total.push(setOg('image:src', libs.portal.assetUrl({path: 'beta.nav.no/images/social-share-fallback.png'}), 'name'));
		}
		else if (value === 'linkedin' && total.indexOf(setOg('type', 'article')) === -1) {
            total.push(setOg('url', req.url.split('?')[0]));
            total.push(setOg('type', 'article'));
            total.push(setOg('title', content.displayName));
            total.push(setOg('description', content.data.ingress));
            total.push(setOg('image', libs.portal.assetUrl({path: 'beta.nav.no/images/social-share-fallback.png'})));
		}
		return total
	},[])

}

function setOg(property, content, name) {
	var og = name ? 'twitter' : 'og';
	name = name || 'property';
	return '<meta ' + name +'="' + og + ':' + property + '" content="' + content + '" />';
}

/*
 * The following DataSources were used in the original CMS page template:

 <datasources>
  <datasource name="getMenuBranch">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="includeTopLevel">false</parameter>
    <paramater name="startLevel">1</paramater>
    <parameter name="levels">5</parameter>
  </datasource>
  <datasource name="getContent">
    <parameter name="contentKeys">${select(param.key,-1)}</parameter>
    <parameter name="query"/>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getMenu" result-element="languages">
    <parameter name="siteKey">20</parameter>
    <parameter name="tagItem">${portal.pageKey}</parameter>
    <parameter name="levels">1</parameter>
  </datasource>
</datasources>

 */
