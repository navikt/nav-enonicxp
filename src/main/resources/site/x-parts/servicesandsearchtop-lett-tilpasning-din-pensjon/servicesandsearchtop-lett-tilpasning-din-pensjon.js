var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('servicesandsearchtop-lett-tilpasning-din-pensjon.html');

function handleGet(req) {

    var params = {
        partName: "servicesandsearchtop-lett-tilpasning-din-pensjon"
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
      <parameter name="menuItemKeys">1073743190</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttypekey=1013</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">25</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">2</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
