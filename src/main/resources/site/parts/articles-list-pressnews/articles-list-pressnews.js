var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('articles-list-pressnews.html');

function handleGet(req) {

    var params = {
        partName: "articles-list-pressnews"
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
  <!--datasource name="getContent">
    <parameter name="contentKeys">${select(param.key,0)}</parameter>
    <parameter name="query"/>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">0</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource-->
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
