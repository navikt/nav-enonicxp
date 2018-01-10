var libs = {
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/xp/thymeleaf'),
	i18n: require('/lib/xp/i18n'),
	nav: require('/lib/nav-utils'),
	util: require('/lib/enonic/util')
}
var view = resolve('articles-list-related-content.html');

exports.get = function(req) {

	var content = libs.portal.getContent();
	var sectionIds = [].concat(content.data.sectionContents || []);

	// Fetch the one introductory text, if exists - as it contains the shortcuts we want to display on the side.
	var queryResult = libs.content.query({
		start: 0,
		count: 1,
		filters: {
			ids: {
				values: sectionIds
			}
		},
		contentTypes: [app.name + ':nav.sidebeskrivelse']
	});
	var introduction = libs.nav.sortContents(queryResult.hits, sectionIds);
	introduction = introduction[0]; // Flatten array into object since this is a single item.

	// TODO: Loop over the selected related contents and fill them with data.
	// ===(loop)===

    var params = {
		  introduction: introduction,
		  heading: libs.i18n.localize({key: 'nav.related.shortcuts'}) // TODO: Toggle this based on locale
    };

	 return {
		body: libs.thymeleaf.render(view, params),
		contentType: 'text/html'
	};
};

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${param.id}</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query">contenttype = 'nav.sidebeskrivelse'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">${select(param.offset, 0)}</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">2</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
