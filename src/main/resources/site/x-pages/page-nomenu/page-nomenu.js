var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('page-nomenu.html');

function handleGet(req) {
    var site = portalLib.getSite();
    var reqContent = portalLib.getContent();

    var params = {
        context: req,
        site: site,
        reqContent: reqContent
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;


/*
 * The following DataSources were used in the original CMS page template:

 <datasources>
  <datasource name="getMenuBranch">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="includeTopLevel">false</parameter>
    <paramater name="startLevel">1</paramater>
    <parameter name="levels">5</parameter>
  </datasource>
  <datasource name="getContent">
    <parameter name="contentKeys">${select(param.key,-1)}</parameter>
    <parameter name="query"/>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getMenu" result-element="languages">
    <parameter name="siteKey">20</parameter>
    <parameter name="tagItem">${portal.pageKey}</parameter>
    <parameter name="levels">1</parameter>
  </datasource>
</datasources>

 */
