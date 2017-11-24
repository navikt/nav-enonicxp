var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('heronighanddaybanner.html');

function handleGet(req) {

    var params = {
        partName: "heronighanddaybanner"
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
    <datasource name="getContentBySection" result-element="banner">
      <parameter name="menuItemKeys">${portal.pageKey}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttype = 'Bilde'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">2</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
