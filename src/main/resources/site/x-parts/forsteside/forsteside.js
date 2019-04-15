var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('forsteside.html');

function handleGet(req) {

    var params = {
        partName: "forsteside"
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
    <datasource name="getContentBySection" result-element="themes">
      <parameter name="menuItemKeys">${select(param.id, '-1')}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttype = 'Emne'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">300</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection" result-element="schematext">
      <parameter name="menuItemKeys">${select(param.id, '-1')}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttype = 'Skjemaveiledertekster'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">5</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
