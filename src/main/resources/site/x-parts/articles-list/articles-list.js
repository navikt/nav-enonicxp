var libs = {
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/thymeleaf'),
	nav: require('/lib/nav-utils'),
	util: require('/lib/enonic/util')
};

var view = resolve('articles-list.html');

exports.get = function(req) {

	var content = libs.portal.getContent();
	var sectionIds = [].concat(content.data.sectionContents || []);

	// Fetch the one introductory text, if exists.
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

	// Fetch remaining items published to this page.
	queryResult = libs.content.query({
		start: 0,
		count: 10,
		filters: {
			ids: {
				values: sectionIds
			}
		},
		contentTypes: [
			app.name + ':Artikkel_Brukerportal',
			app.name + ':Kort_om',
			app.name + ':nav.rapporthandbok',
			app.name + ':Ekstern_lenke',
			app.name + ':nav.nyhet'
		]
	});
	if (queryResult.total > 0) {
		for (var i = 0; i < queryResult.hits.length; i++) {
			// URL should be created to this content, unless if the field URL is present.
			queryResult.hits[i].data.url = queryResult.hits[i].data.url || libs.portal.pageUrl({
				'id': queryResult.hits[i]._id
			});
			// Alternative way of doing it (translated 1-to-1 from XSLT):
			// articles.hits[i].url = articles.hits[i].type === app.name + ':Ekstern_lenke' ? articles.hits[i].data.url : libs.portal.pageUrl({'key':articles.hits[i]._id});

			// Check for setting on a content for its relation. Output in the "rel" attribute.
			queryResult.hits[i].data.target = queryResult.hits[i].data.target === 'new' ? 'external' : '';
/*
			<xsl:variable name="preface">
	  		  <xsl:choose>
	  				<xsl:when test="@contenttype = 'Kort_om'">
	  					 <xsl:value-of select="contentdata/ingress"/>
	  				</xsl:when>
	  				<xsl:when test="@contenttype = 'Ekstern_lenke'">
	  					 <xsl:value-of select="contentdata/list_description"/>
	  				</xsl:when>
	  				<xsl:otherwise>
	  					 <xsl:value-of select="contentdata/preface"/>
	  				</xsl:otherwise>
	  		  </xsl:choose>
		  </xsl:variable>
*/
			var preface;
			switch(queryResult.hits[i].type) {
				case app.name + ":Kort_om":
					preface = queryResult.hits[i].data.ingress;
					break;
				case app.name + ":Ekstern_lenke":
					preface = queryResult.hits[i].data.list_description;
					break;
				default:
					preface = queryResult.hits[i].data.preface;
			}
			// Handle cropping of long text in field prefaces. Simulating stk:text.crop()
			if (preface) {
				if (preface.length > 400) {
					preface = preface.substring(0,400-3) + "...";
				}
				queryResult.hits[i].data.preface = preface;
			}
		}
	}
	var articles = libs.nav.sortContents(queryResult.hits, sectionIds);

    var params = {
		  introduction: introduction,
		  articles: articles
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
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${param.id}</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query">contenttype = 'Artikkel_Brukerportal' or contenttype = 'Kort_om' or contenttype = 'nav.rapporthandbok' or contenttype = 'Ekstern_lenke' or contenttype = 'nav.nyhet'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">${select(param.offset, 0)}</parameter>
    <parameter name="count">10</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
