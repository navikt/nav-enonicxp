var menuLib = require('/lib/menu');
var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('linklist-heroblocks.html');

function handleGet(req) {

    //var menuItems = menuLib.getSubMenus(site, 4);

    var model = {

    };

    return {
        contentType: 'text/html',
        body: thymeleafLib.render(view, model)
    };
}

exports.get = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
  <datasource name="getMenuBranch" result-element="subcat">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="includeTopLevel">true</parameter>
    <paramater name="startLevel">4</paramater>
    <parameter name="levels">2</parameter>
  </datasource>
</datasources>

*/
