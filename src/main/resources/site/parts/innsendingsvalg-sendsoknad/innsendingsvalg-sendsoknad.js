var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('innsendingsvalg-sendsoknad.html');

function handleGet(req) {

    var params = {
        partName: "innsendingsvalg-sendsoknad"
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
  <datasource name="getContentBySection" result-element="schematext">
    <parameter name="menuItemKeys">${select(param.id, '-1')}</parameter>
    <parameter name="levels">0</parameter>
    <parameter name="query">contenttype = 'Skjemaveiledertekster'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">10</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">0</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${select(param.id,0)}</parameter>
    <parameter name="levels">2</parameter>
    <parameter name="query">contenttype = 'skjema_for_veileder'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getSubMenu" result-element="submission">
    <parameter name="menuItemKey" type="int">${portal.pageKey}</parameter>
    <parameter name="tagItem" type="boolean">0</parameter>
    <parameter name="levels" type="boolean">0</parameter>
  </datasource>
  <!--datasource name="getMenuBranch" result-element="submission">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="includeTopLevel">true</parameter>
	<paramater name="startLevel" type="int">5</paramater>
    <parameter name="levels" type="int">2</parameter>
  </datasource-->
  <datasource name="getMenuItem" result-element="full-path">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="withParents">true</parameter>
  </datasource>
</datasources>

*/
