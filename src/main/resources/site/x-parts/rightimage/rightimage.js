var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('rightimage.html');

function handleGet(req) {

    var params = {
        partName: "rightimage"
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
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.id,0)}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttype = 'Driftsmelding_nav'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
