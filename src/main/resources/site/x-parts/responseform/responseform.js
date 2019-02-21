var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('responseform.html');

function handleGet(req) {

    var params = {
        partName: "responseform"
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
  <datasource name="getContentByCategory">
    <parameter name="categoryKeys">8437</parameter>
    <parameter name="levels">0</parameter>
    <parameter name="query">${select(param.themeQuery, '')}</parameter>
    <parameter name="orderBy">title DESC</parameter>
    <parameter name="index">0</parameter>
    <parameter name="count">500</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">0</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${select(portal.pageKey, -1)}</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query"/>
    <parameter name="orderBy">title ASC</parameter>
    <parameter name="index">${select(param.index, 0)}</parameter>
    <parameter name="count">${select(param.count, 100)}</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
