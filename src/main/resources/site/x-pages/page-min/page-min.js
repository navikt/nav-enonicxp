var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('page-min.html');

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
    <parameter name="levels">3</parameter>
  </datasource>
  <datasource name="getMenu" result-element="languages">
    <parameter name="siteKey">20</parameter>
    <parameter name="tagItem">${portal.pageKey}</parameter>
    <parameter name="levels">1</parameter>
  </datasource>
</datasources>

 */
