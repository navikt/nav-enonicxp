var libs = {
	portal: require('/lib/xp/portal')
	content: require('/lib/xp/content')
	thymeleaf: require('/lib/xp/thymeleaf')
}
var view = resolve('articles-list-related-content.html');

exports.get = function(req) {

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

    var params = {
		  introduction: introduction
    };

    return {
		 body: thymeleafLib.render(view, params),
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
