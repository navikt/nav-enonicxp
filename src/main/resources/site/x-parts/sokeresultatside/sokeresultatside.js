var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('sokeresultatside.html');

function handleGet(req) {

    var params = {
        partName: "sokeresultatside"
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
      <parameter name="categoryKeys">5473</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy">title ASC</parameter>
      <parameter name="index">0</parameter>
      <parameter name="count">100</parameter>
      <parameter name="includeData">false</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentByCategory">
      <parameter name="categoryKeys">5289,881</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">${ stringlength(param.q) != 0 ? buildFreetextQuery( 'data/*', trim(param.q), 'AND' ) : stringlength(param.query) != 0 ? param.query : "" }</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1000</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentByCategory">
      <parameter name="categoryKeys">1519</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">100</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentByCategory">
      <parameter name="categoryKeys">5306</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">100</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${select(param.origId, -1)}</parameter>
      <parameter name="withParents">false</parameter>
    </datasource>
  </datasources>

*/
