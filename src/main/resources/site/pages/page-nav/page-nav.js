var libs = {
	thymeleaf: require('/lib/xp/thymeleaf'),
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	menu: require('/lib/menu'),
	util: require('/lib/enonic/util')
}
var view = resolve('page-nav.html');
var accessibleLetters = 'abcdefghijklmnopqrstuvwxyzæøå'.split('');

/*
	Display names of page templates that in Enonic CMS used page-nav.xsl but did NOT contain a datasource that would produce /result/contents/content
	Since the XSLT file checked for data in /result/contents/content, these page templates will never show breadcrumbs with that code
	Yeah, it's hacky hardcoded stuff, but an improvement will most likely require changes to the data model.
	Of course, modifying page template display names will break this functionality.
	UNFORTUNATELY, many pages (such as /no/person/skjemaer-for-privatpersoner/skjema) do not have a page template because they have a custom part setup =[
 */
var breadcrumbPageTemplateBlackList = [
	'Artikkel - inspirasjon',
	'Din situasjon',
	'Person: seksjonsforside (nivå 1)',
	'Person: seksjonsside (nivå 2)',
	'Skjema 1: hovedinnganger (privat | bedrift | etc)',
	'Skjema 2: Velg emne',
	'Skjema 3: Velg skjema',
	'Skjema 4: innsendingsvalg (der skjema styrer innsendingvalg)',
	'Skjema 4: innsendingsvalg (der tema (eks. Dagpenger) styrer innsendingsvalg)',
	'Skjema 4: innsendingsvalg (post vs dokumentinnsending)',
	'Skjema 5: Velg vedlegg',
	'Skjema 6: Finn adresse',
	'Skjema 7: Last ned',
	'Skjema: Dokumentinnsending',
	'Skjema: Innsendingsvalg for førsteside',
	'Skjema: søk',
	'Skjemaveileder - postnr - enhet',
	'Skriv til oss: temavelger, lenkeliste',
	'System: Innhold A - Å uten hode og fot',
	'System: feilside (404)',
	'Visning av artikkelliste for Pressemeldinger (Subseksjon)'
];



function handleGet(req) {
    var site = libs.portal.getSite();
    var content = libs.portal.getContent();

    var menuItems = libs.menu.getSubMenus(site, 4);
    menuItems = menuItems[0];
   // log.info(JSON.stringify(site));

	var breadcrumbs = libs.menu.getBreadcrumbMenu({
		linkActiveItem: false,
		showHomepage: false
	});

	// On Localhost, first 3 items are useless, slice! In XSLT they did it more complicated by checking types of content for each parent node, skipping that for now.
	if (breadcrumbs.items.length > 3) {
		breadcrumbs.items = breadcrumbs.items.slice(3);

		breadcrumbs.items = breadcrumbs.items.reduce(function (t,el) {
            if (el.type !== app.name + ':magic-folder') {
                el.url = (el.type === 'base:folder') ? null : el.url;
                t.push(el)
            }
            return t;
        }, [])
		// NAV doesn't link CMS Labels (Folders in XP), make sure to remove URL data for these so we don't link them.
		//for (var i = 0; i < breadcrumbs.items.length; i++) {
		//	if (breadcrumbs.items[i].type === app.name + ':magic-folder') {
		//		breadcrumbs.items[i].url = null;
		//	}
		//}
	}
	// Looks like breadcrumbs are never shown if only 2 items or less, so nuke it.
	if (breadcrumbs.items.length <= 2) {
		breadcrumbs = null;
	}

	// Don't show breadcrumbs if the content uses a page template that in Enonic CMS didn't have a datasource producing data in /result/contents/content
	if (content.page && content.page.template) {
		var pageTemplate = libs.content.get({ key: content.page.template });
		if (pageTemplate && breadcrumbPageTemplateBlackList.indexOf(pageTemplate.displayName)) {
			breadcrumbs = null;
		}
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

    var model = {
		isEditMode: (req.mode === 'edit'),
        context: req,
        site: site,
        content: content,
        westRegionClass: regionsInEast && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        eastRegionClass: regionsInWest && !regionsInCenter ? 'col-md-6' : 'col-md-4',
        centerRegionClass: regionsInEast && regionsInWest ? 'col-md-4' : (regionsInEast || regionsInWest ? 'col-md-8' : 'col-md-12'),
        frontPageUrl: libs.portal.pageUrl({id: site._id}),
        contentAZPage: '/www.nav.no/no/innhold-a-aa', // TODO make page parameter with default value
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
