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
/*
    <xsl:if test="/result/contents/content or /result/context/page/page-template/name = 'Subseksjonsside'">
      <xsl:attribute name="class">
        <xsl:text>contentpage</xsl:text>
      </xsl:attribute>
    </xsl:if>
*/

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
        body: libs.thymeleaf.render(view, model)
    };
}

exports.get = handleGet;