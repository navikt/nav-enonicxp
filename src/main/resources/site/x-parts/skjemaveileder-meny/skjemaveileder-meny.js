var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('skjemaveileder-meny.html');

function handleGet(req) {

    var params = {
        partName: "skjemaveileder-meny"
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
    <datasource name="getMenuBranch">
      <parameter name="menuItemKey">${param.id}</parameter>
      <parameter name="includeTopLevel">false</parameter>
      <parameter name="startLevel">3</parameter>
      <parameter name="levels">0</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.id,0)}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttype = 'Sidebeskrivelse'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection" result-element="schematext">
      <parameter name="menuItemKeys">${select(param.id, '-1')}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttype = 'Skjemaveileder_ettersend_txt'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
