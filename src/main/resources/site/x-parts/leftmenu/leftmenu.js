var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('leftmenu.html');

function handleGet(req) {

    var params = {
        partName: "leftmenu"
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
      <parameter name="includeTopLevel">false</parameter>
      <parameter name="startLevel">0</parameter>
      <parameter name="levels">0</parameter>
    </datasource>
  </datasources>

*/
