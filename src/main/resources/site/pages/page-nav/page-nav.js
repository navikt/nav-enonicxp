var libs = {
	thymeleaf: require('/lib/xp/thymeleaf'),
	portal: require('/lib/xp/portal'),
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
	libs.util.log(breadcrumbs);
	// On Localhost, first 3 items are useless, slice! In XSLT they did it more complicated by checking types of content for each parent node, skipping that for now.
	if (breadcrumbs.items.length > 3) {
		breadcrumbs.items = breadcrumbs.items.slice(3);

		// NAV doesn't link CMS Labels (Folders in XP), make sure to remove URL data for these so we don't link them.
		for (var i = 0; i < breadcrumbs.items.length; i++) {
			if (breadcrumbs.items[i].type === 'base:folder') {
				breadcrumbs.items[i].url = null;
			}
		}
	}
	// Looks like breadcrumbs are never shown if only 2 items or less, so nuke it.
	if (breadcrumbs.items.length <= 2) {
		breadcrumbs = null;
	}

    var regionsInWest = content.page.regions['region-west'] && content.page.regions['region-west'].components.length > 0;
    var regionsInEast = content.page.regions['region-east'] && content.page.regions['region-east'].components.length > 0;
    var regionsInCenter = content.page.regions['region-center'] && content.page.regions['region-center'].components.length > 0;

	// Check if there is content (huh!? always content in XP ...) or a specific template being used.
	// Research: the mentioned page template doesn't exists anymore. Looking for existing contents/content is impossible in XP since all pages are content and will have something returned with .getContent(). Something else needs to be done here.
	var bodyClassExtras = "contentpage"; // Perhaps just check if we're viewing a "section" CTY?
/*
    <xsl:if test="/result/contents/content or /result/context/page/page-template/name = 'Subseksjonsside'">
      <xsl:attribute name="class">
        <xsl:text>contentpage</xsl:text>
      </xsl:attribute>
    </xsl:if>
*/

    var params = {
        context: req,
        site: site,
        content: content,
        westRegionClass: regionsInEast && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        eastRegionClass: regionsInWest && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        centerRegionClass: regionsInEast && regionsInWest ? 'col-md-4' : (regionsInEast || regionsInWest ? 'col-md-8' : 'col-md-12'),
        frontPageUrl: libs.portal.pageUrl({id: site._id}),
        contentAZPage: '/sites/www.nav.no/no/innhold-a-aa', // TODO make page parameter with default value
        accessibleLetters: accessibleLetters,
        menu: menuItems,
		  breadcrumbs: breadcrumbs,
		  bodyClassExtras: bodyClassExtras
    };

    var body = libs.thymeleaf.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;


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
