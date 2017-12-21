var libs = {
	thymeleaf: require('/lib/xp/thymeleaf'),
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content')
};

var view = resolve('articles-list-pressnews.html');

exports.get = function(req) {

	/*
	 * The following DataSources were used in the original CMS portlet:

	<datasources>
	  <datasource name="getContentBySection">
	    <parameter name="menuItemKeys">${param.id}</parameter>
	    <parameter name="levels">1</parameter>
	    <parameter name="query">contenttype = 'nav.sidebeskrivelse' or contenttype = 'nav.pressemelding' or contenttype = 'nav.nyhet'</parameter>
	    <parameter name="orderBy"/>
	    <parameter name="index">${select(param.offset, 0)}</parameter>
	    <parameter name="count">400</parameter>
	    <parameter name="includeData">true</parameter>
	    <parameter name="childrenLevel">1</parameter>
	    <parameter name="parentLevel">0</parameter>
	  </datasource>
	</datasources>

	*/
	var results = libs.content.query({
		start: 0,
		count: 400,
		sort: "",
		query: "",
		contentTypes: [
			app.name + ":nav.sidebeskrivelse",
			app.name + ":nav.pressemelding",
			app.name + ":nav.nyhet"
		]
	});

    var params = {
        partName: "articles-list-pressnews",
		contents: results.hits || null
    };

    var body = libs.thymeleaf.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
};
