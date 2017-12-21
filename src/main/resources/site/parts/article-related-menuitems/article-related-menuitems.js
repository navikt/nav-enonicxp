var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/xp/thymeleaf');
var menuLib = require('/lib/menu');

var view = resolve('article-related-menuitems.html');

function handleGet(req) {
    var content = portalLib.getContent();

    var menus = menuLib.getSubMenus(content, 1);
//    log.info('menus: ' + JSON.stringify(menus, null, 2));

    var params = {
        menus: menus
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
      <parameter name="menuItemKey">${portal.pageKey}</parameter>
      <parameter name="includeTopLevel">true</parameter>
      <parameter name="startLevel">3</parameter>
      <parameter name="levels">0</parameter>
    </datasource>
  </datasources>

*/
