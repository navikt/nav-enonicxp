var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('factsheet-related-content.html');

function handleGet(req) {

    var params = {
        partName: "factsheet-related-content"
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
    <datasource name="getContent">
      <parameter name="contentKeys">${select(param.key, -1)}</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getRelatedContent" result-element="relatedforms">
      <parameter name="contentKeys">${select(param.key,-1)}</parameter>
      <parameter name="relation">1</parameter>
      <parameter name="query">contenttype='Skjema' or contenttype='Skjema_for_veileder'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">20</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
